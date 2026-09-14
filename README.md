# Mercapp — simulador de negócios digitais

Marketplace + motor de simulação econômica: marketing digital, produtos,
tendências, bots consumidores, tráfego pago e analytics, tudo conectado
(Node/Express/PostgreSQL).

## O que já funciona

**Marketplace e produtos**
- Criar, editar e excluir produtos (e-book, curso, template, software, serviço, físico, digital, outro)
- Marketplace com busca, filtro por categoria e ordenação (relevância, recentes, mais vendidos, preço)
- Página individual de cada produto, "Meus Produtos", empresa com saldo inicial de R$ 5.000,00

**Motor de simulação (roda sozinho em segundo plano, a cada ~20s)**
- Tendências com ciclo de vida (sobem, atingem pico, caem, expiram e novas nascem), com histórico
- Eventos de mercado aleatórios (viralização, queda de interesse, crise, evento global) que afetam categorias
- 60 bots com 8 perfis de comportamento diferentes (curioso, econômico, impulsivo, exigente, fiel, caçador de
  novidades, sensível a preço, influenciado por avaliações), cada um pontuando produtos por tendência, preço,
  avaliação, fidelidade e novidade antes de "descobrir" (view) e, com atraso natural, comprar
- Avaliações pós-compra geradas a partir do perfil do bot e do histórico de nota do produto, atualizando a
  reputação da empresa
- Integração opcional com tendência real (pageviews da Wikipédia) mapeada para as categorias do jogo, com
  cache de 6h e fallback silencioso se a fonte externa falhar (ativa com `ENABLE_REAL_TRENDS=true`)

**Marketing e resultados**
- Tráfego pago: criar campanhas (orçamento, duração, público, região, objetivo), orçamento debitado na
  criação e consumido aos poucos pelo motor de simulação (impressões → cliques → views)
- Analytics por período (24h / 7d / 30d / 90d / tudo): vendas, receita, CPC, CTR, CPA, ROI e lucro por produto
- Pedidos e Avaliações recebidos, Ranking (faturamento, produto mais vendido, melhor avaliação)
- Página Economia explicando os mecanismos anti-inflação (taxa de 8% por venda, orçamento de campanha
  debitado à vista, tendências que não duram para sempre, bots com orçamento limitado)

## O que ainda é placeholder / próximos passos

- Sem autenticação de usuário: a "empresa atual" fica salva no navegador (localStorage); a página Empresa
  já mostra os dados mas a edição só é gravada quando o cadastro multiempresa for feito
- A relevância do marketplace geral ainda é simplificada (vendas + avaliação); dá pra evoluir para incorporar
  o score de tendência do motor de bots diretamente na ordenação
- O botão "Forçar novo ciclo" nas páginas Dashboard/Tendências existe para você ver o motor funcionando sem
  esperar o timer — em produção ele roda sozinho o tempo todo enquanto o servidor estiver de pé

## Como rodar localmente

1. Tenha um PostgreSQL rodando (local ou um serviço como Railway/Supabase).
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL`.
3. Instale as dependências:
   ```
   npm install
   ```
4. Crie as tabelas (e a empresa padrão):
   ```
   npm run db:init
   ```
5. Suba o servidor:
   ```
   npm start
   ```
6. Acesse `http://localhost:3000`.

## Deploy no Railway

1. Crie um novo projeto no Railway e adicione um serviço PostgreSQL.
2. Suba este código como um segundo serviço (o Railway detecta o `package.json` e usa `npm start`).
3. A variável `DATABASE_URL` já vem preenchida automaticamente pelo Railway ao conectar o serviço ao banco.
4. Rode `npm run db:init` uma vez (via `railway run npm run db:init` ou no shell do serviço) para criar as tabelas.

## Estrutura

```
mercapp/
  server.js               # servidor Express + inicia o motor de simulacao
  db/
    schema.sql             # todas as tabelas (marketplace + simulacao)
    pool.js                # conexao com Postgres
    init.js                # roda o schema.sql e cria empresa/bots/tendencias iniciais
  simulation/
    engine.js              # o motor: tendencias, eventos, campanhas, bots, compras, avaliacoes
    botProfiles.js          # pesos de decisao e comentarios por perfil de bot
    trendsSource.js         # busca de tendencia real (Wikipedia pageviews) com cache/fallback
  routes/
    products.js, misc.js, trends.js, campaigns.js, orders.js, analytics.js, ranking.js, simulation.js
  public/
    index.html, produto.html, criar-produto.html, meus-produtos.html,
    dashboard.html, marketing.html, trafego-pago.html, analytics.html,
    tendencias.html, pedidos.html, avaliacoes.html, empresa.html,
    economia.html, ranking.html
    css/style.css           # identidade visual
    js/app.js, js/sidebar.js
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | conexão com o PostgreSQL |
| `PORT` | não | porta do servidor (padrão 3000) |
| `SIMULATION_TICK_MS` | não | intervalo do motor de simulação em ms (padrão 20000) |
| `ENABLE_REAL_TRENDS` | não | `true` para buscar tendências reais (Wikipedia); desligado por padrão |

## Testando o motor sem esperar

Toda página com o botão **"Forçar novo ciclo"** (Dashboard e Tendências) chama
`POST /api/simulation/tick` e roda um ciclo completo na hora — útil pra ver
bots comprando e avaliando sem esperar os ~20s do timer automático.
