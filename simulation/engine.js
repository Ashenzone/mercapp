const { pool } = require('../db/pool');
const { PERFIS, comentarioAleatorio } = require('./botProfiles');
const { buscarTendenciasReais } = require('./trendsSource');

const PLATFORM_FEE = 0.08; // 8% fica "fora" da economia (evita inflacao descontrolada)
const BOTS_POR_TICK = 40;   // amostra de bots avaliados a cada ciclo (performance)
const PRODUTOS_AVALIADOS_POR_BOT = 6; // quantos produtos cada bot compara por ciclo

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// -------------------- 1. TENDENCIAS --------------------
async function atualizarTendencias(client) {
  const { rows: trends } = await client.query('SELECT * FROM trends');
  for (const t of trends) {
    const idadeDias = (Date.now() - new Date(t.created_at).getTime()) / 86400000;
    const cicloVida = idadeDias / t.estimated_duration_days; // 0 -> nasce, 1 -> deveria acabar

    // curva de vida: sobe, atinge pico perto de 0.4-0.6 do ciclo, depois cai
    let alvoMomentum;
    if (cicloVida < 0.4) alvoMomentum = 'subindo';
    else if (cicloVida < 0.7) alvoMomentum = 'pico';
    else if (cicloVida < 1) alvoMomentum = 'caindo';
    else alvoMomentum = 'esgotada';

    let delta;
    if (alvoMomentum === 'subindo') delta = 2 + Math.random() * 4;
    else if (alvoMomentum === 'pico') delta = (Math.random() - 0.5) * 3;
    else if (alvoMomentum === 'caindo') delta = -(2 + Math.random() * 5);
    else delta = -(5 + Math.random() * 5);

    const novaPop = clamp(Number(t.popularity) + delta, 0, 100);
    const historico = Array.isArray(t.history) ? t.history : [];
    historico.push({ t: new Date().toISOString(), popularity: Math.round(novaPop) });
    if (historico.length > 60) historico.shift();

    await client.query(
      `UPDATE trends SET popularity=$1, growth=$2, momentum=$3, history=$4, updated_at=now() WHERE id=$5`,
      [novaPop, Number(delta.toFixed(2)), alvoMomentum, JSON.stringify(historico), t.id]
    );
  }

  // tendencias esgotadas ha muito tempo saem e uma nova nasce em categoria aleatoria
  const esgotadas = trends.filter((t) => {
    const idadeDias = (Date.now() - new Date(t.created_at).getTime()) / 86400000;
    return idadeDias / t.estimated_duration_days > 1.3;
  });
  for (const velha of esgotadas) {
    await client.query('DELETE FROM trends WHERE id = $1', [velha.id]);
    const { rows: cats } = await client.query('SELECT id, name FROM categories ORDER BY random() LIMIT 1');
    if (cats.length) {
      await client.query(
        `INSERT INTO trends (name, category_id, popularity, growth, momentum, estimated_duration_days)
         VALUES ($1,$2,$3,$4,'subindo',$5)`,
        [`Nova onda de ${cats[0].name}`, cats[0].id, 15 + Math.random() * 15, 5, 15 + Math.floor(Math.random() * 30)]
      );
    }
  }
}

// -------------------- 2. EVENTOS DE MERCADO --------------------
async function talvezGerarEvento(client) {
  if (Math.random() > 0.08) return; // ~8% de chance por ciclo

  const { rows: cats } = await client.query('SELECT id, name FROM categories ORDER BY random() LIMIT 1');
  if (!cats.length) return;
  const cat = cats[0];

  const tipos = [
    { type: 'viralizacao', delta: 25, titulo: `Assunto de ${cat.name} viralizou nas redes`, desc: `Um tema de ${cat.name} comecou a receber enorme quantidade de atencao.` },
    { type: 'queda_interesse', delta: -20, titulo: `Interesse por ${cat.name} caiu`, desc: `A procura pelo nicho de ${cat.name} comecou a diminuir.` },
    { type: 'crise', delta: -15, titulo: `Retracao em ${cat.name}`, desc: `A procura por produtos de ${cat.name} caiu temporariamente.` },
    { type: 'evento_global', delta: 18, titulo: `Acontecimento real impacta ${cat.name}`, desc: `Um evento do mundo real aumentou o interesse por ${cat.name}.` },
  ];
  const evento = tipos[Math.floor(Math.random() * tipos.length)];

  await client.query(
    `INSERT INTO market_events (type, title, description, category_id, effect, expires_at)
     VALUES ($1,$2,$3,$4,$5, now() + interval '2 days')`,
    [evento.type, evento.titulo, evento.desc, cat.id, JSON.stringify({ popularity_delta: evento.delta })]
  );

  await client.query(
    `UPDATE trends SET popularity = LEAST(100, GREATEST(0, popularity + $1)), updated_at = now() WHERE category_id = $2`,
    [evento.delta, cat.id]
  );
}

// -------------------- 3. CAMPANHAS (TRAFEGO PAGO) --------------------
async function processarCampanhas(client) {
  const { rows: campanhas } = await client.query(
    `SELECT c.*, p.price_cents, p.rating_avg, p.status AS product_status
     FROM campaigns c JOIN products p ON p.id = c.product_id
     WHERE c.status = 'active'`
  );

  for (const c of campanhas) {
    const orcamentoRestante = c.budget_cents - c.spent_cents;
    const fimPrevisto = new Date(c.started_at).getTime() + c.duration_days * 86400000;
    if (orcamentoRestante <= 0 || Date.now() > fimPrevisto || c.product_status !== 'active') {
      await client.query('UPDATE campaigns SET status = \'finished\' WHERE id = $1', [c.id]);
      continue;
    }

    // gasta uma fatia do orcamento por ciclo (simula ritmo de veiculacao)
    const gastoCiclo = Math.min(orcamentoRestante, Math.round(c.budget_cents / (c.duration_days * 6)) || 100);
    const cpm = 1500; // custo estimado por 1000 impressoes, em centavos
    const impressoes = Math.round((gastoCiclo / cpm) * 1000);
    const ctrBase = 0.02 + (Number(c.rating_avg) / 5) * 0.03; // produtos melhor avaliados clicam mais
    const cliques = Math.round(impressoes * ctrBase);

    await client.query(
      `UPDATE campaigns SET spent_cents = spent_cents + $1, impressions = impressions + $2, clicks = clicks + $3 WHERE id = $4`,
      [gastoCiclo, impressoes, cliques, c.id]
    );
    await client.query('UPDATE products SET views_count = views_count + $1 WHERE id = $2', [cliques, c.product_id]);
    // o orcamento ja foi debitado do saldo da empresa na criacao da campanha (evita inflacao);
    // aqui so controlamos o ritmo de veiculacao e as metricas (impressions/clicks/spent_cents)
  }
}

// -------------------- 4. BOTS: DESCOBERTA, COMPRA E AVALIACAO --------------------
async function pontuarProduto(bot, produto, tendenciaPop) {
  const perfil = PERFIS[bot.profile] || PERFIS.curioso;
  let score = 10;

  // relevancia de tendencia (0-100 -> 0-1)
  score += (tendenciaPop / 100) * 40 * perfil.peso_tendencia;

  // preco: quanto mais caro, mais penaliza perfis sensiveis a preco
  const precoReais = produto.price_cents / 100;
  score -= Math.min(30, precoReais / 10) * perfil.peso_preco;

  // avaliacao
  score += Number(produto.rating_avg) * 6 * perfil.peso_avaliacao;
  if (perfil.rating_minimo && Number(produto.rating_avg) > 0 && Number(produto.rating_avg) < perfil.rating_minimo) {
    score -= 25; // exigente descarta produto mal avaliado
  }
  if (perfil.peso_volume_avaliacoes) {
    score += Math.min(20, produto.rating_count) * perfil.peso_volume_avaliacoes;
  }

  // fidelidade
  if (perfil.bonus_empresa_fidelizada && bot.loyalty_company_id === produto.company_id) {
    score += perfil.bonus_empresa_fidelizada * 40;
  }

  // novidade
  if (perfil.bonus_produto_novo) {
    const idadeDias = (Date.now() - new Date(produto.created_at).getTime()) / 86400000;
    if (idadeDias < 5) score += perfil.bonus_produto_novo * 30;
  }

  // categoria favorita puxa exploracao
  if (bot.favorite_category_id === produto.category_id) score += 15;
  else score *= (0.4 + perfil.exploracao * 0.6); // fora do nicho, exploracao decide o quanto ainda interessa

  return Math.max(0, score);
}

async function rodarBots(client) {
  const { rows: produtos } = await client.query(
    `SELECT p.*, co.balance_cents AS company_balance
     FROM products p JOIN companies co ON co.id = p.company_id
     WHERE p.status = 'active' AND (p.stock_quantity IS NULL OR p.stock_quantity > 0)`
  );
  if (produtos.length === 0) return { visitas: 0, compras: 0, avaliacoes: 0 };

  const { rows: tendencias } = await client.query('SELECT category_id, popularity FROM trends');
  const popPorCategoria = new Map(tendencias.map((t) => [t.category_id, Number(t.popularity)]));

  const { rows: bots } = await client.query('SELECT * FROM bots ORDER BY random() LIMIT $1', [BOTS_POR_TICK]);

  let visitas = 0, compras = 0, avaliacoes = 0;

  for (const bot of bots) {
    // cada bot olha uma amostra de produtos (nao o marketplace inteiro)
    const candidatos = [...produtos].sort(() => Math.random() - 0.5).slice(0, PRODUTOS_AVALIADOS_POR_BOT);

    let melhor = null, melhorScore = -1;
    for (const p of candidatos) {
      const pop = popPorCategoria.get(p.category_id) || 20;
      const score = await pontuarProduto(bot, p, pop);
      if (score > melhorScore) { melhorScore = score; melhor = p; }
    }
    if (!melhor || melhorScore < 12) continue; // nao achou nada interessante o suficiente pra "descobrir"

    visitas++;
    await client.query('UPDATE products SET views_count = views_count + 1 WHERE id = $1', [melhor.id]);

    const perfil = PERFIS[bot.profile] || PERFIS.curioso;
    // score alto = mais exposto/relevante -> maior chance de compra (atraso natural: nem toda visita vira compra)
    const probCompra = clamp(perfil.prob_compra_base * (melhorScore / 40), 0.01, 0.65);
    if (Math.random() > probCompra) continue;
    if (melhor.price_cents / 100 > bot.budget_cents / 100) continue; // bot nao tem orcamento

    // ---- efetiva a compra ----
    const receitaLiquida = Math.round(melhor.price_cents * (1 - PLATFORM_FEE));
    await client.query('BEGIN');
    try {
      const pedido = await client.query(
        `INSERT INTO orders (product_id, company_id, bot_id, price_cents, source)
         VALUES ($1,$2,$3,$4,'organico') RETURNING id`,
        [melhor.id, melhor.company_id, bot.id, melhor.price_cents]
      );
      await client.query(
        `UPDATE products SET sales_count = sales_count + 1,
                stock_quantity = CASE WHEN stock_quantity IS NULL THEN NULL ELSE GREATEST(0, stock_quantity - 1) END
         WHERE id = $1`,
        [melhor.id]
      );
      await client.query('UPDATE companies SET balance_cents = balance_cents + $1 WHERE id = $2', [receitaLiquida, melhor.company_id]);
      await client.query('COMMIT');
      compras++;

      // ---- possivel avaliacao apos a compra ----
      const probAvaliar = 0.5;
      if (Math.random() < probAvaliar) {
        const ratingBase = melhor.rating_count > 0 ? Number(melhor.rating_avg) : 3.5;
        let rating = Math.round(clamp(ratingBase + (Math.random() - 0.5) * 2, 1, 5));
        const comentario = comentarioAleatorio(rating);

        await client.query(
          `INSERT INTO reviews (product_id, order_id, bot_id, rating, comment) VALUES ($1,$2,$3,$4,$5)`,
          [melhor.id, pedido.rows[0].id, bot.id, rating, comentario]
        );
        await client.query(
          `UPDATE products SET
             rating_avg = ((rating_avg * rating_count) + $1) / (rating_count + 1),
             rating_count = rating_count + 1
           WHERE id = $2`,
          [rating, melhor.id]
        );
        await client.query(
          `UPDATE companies SET reputation = (
             SELECT COALESCE(AVG(rating_avg), 0) FROM products WHERE company_id = $1 AND rating_count > 0
           ) WHERE id = $1`,
          [melhor.company_id]
        );
        avaliacoes++;
      }
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Erro ao processar compra do bot:', err.message);
    }
  }

  return { visitas, compras, avaliacoes };
}

// -------------------- ORQUESTRACAO --------------------
async function rodarCiclo() {
  const client = await pool.connect();
  let resultado = {};
  try {
    await atualizarTendencias(client);
    await talvezGerarEvento(client);
    await processarCampanhas(client);
    resultado = await rodarBots(client);
    await client.query(
      `UPDATE simulation_state SET tick_count = tick_count + 1, last_tick = now() WHERE id = true`
    );
  } finally {
    client.release();
  }

  // busca de tendencias reais roda fora da transacao principal e nunca derruba o ciclo
  buscarTendenciasReais().catch(() => {});

  return resultado;
}

let intervalId = null;
function iniciarLoopDeSimulacao(intervaloMs = 20000) {
  if (intervalId) return;
  intervalId = setInterval(() => {
    rodarCiclo().catch((err) => console.error('Erro no ciclo de simulacao:', err));
  }, intervaloMs);
  console.log(`Motor de simulacao rodando a cada ${intervaloMs / 1000}s.`);
}

module.exports = { rodarCiclo, iniciarLoopDeSimulacao };
