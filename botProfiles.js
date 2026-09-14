// Cada perfil de bot pesa os fatores de decisao de um jeito diferente.
// Esses pesos sao usados pelo engine para calcular a "pontuacao de interesse"
// de um bot por um produto, e depois a probabilidade de compra.

const PERFIS = {
  curioso: {
    exploracao: 0.9,       // gosta de olhar coisas novas, mesmo fora do nicho favorito
    peso_tendencia: 0.4,
    peso_preco: 0.3,
    peso_avaliacao: 0.4,
    prob_compra_base: 0.12,
  },
  economico: {
    exploracao: 0.3,
    peso_tendencia: 0.3,
    peso_preco: 0.9,        // preto baixo pesa muito
    peso_avaliacao: 0.5,
    prob_compra_base: 0.10,
  },
  impulsivo: {
    exploracao: 0.6,
    peso_tendencia: 0.7,
    peso_preco: 0.2,
    peso_avaliacao: 0.2,
    prob_compra_base: 0.28,  // compra mais facil
  },
  exigente: {
    exploracao: 0.2,
    peso_tendencia: 0.3,
    peso_preco: 0.4,
    peso_avaliacao: 0.9,     // so compra se a avaliacao for boa
    prob_compra_base: 0.08,
    rating_minimo: 3.5,
  },
  fiel: {
    exploracao: 0.15,
    peso_tendencia: 0.2,
    peso_preco: 0.3,
    peso_avaliacao: 0.5,
    prob_compra_base: 0.14,
    bonus_empresa_fidelizada: 0.35,
  },
  cacador_novidades: {
    exploracao: 0.7,
    peso_tendencia: 0.6,
    peso_preco: 0.3,
    peso_avaliacao: 0.2,
    prob_compra_base: 0.16,
    bonus_produto_novo: 0.3,   // produtos criados ha poucos dias
  },
  sensivel_preco: {
    exploracao: 0.25,
    peso_tendencia: 0.3,
    peso_preco: 1.0,
    peso_avaliacao: 0.4,
    prob_compra_base: 0.09,
  },
  influenciado_avaliacoes: {
    exploracao: 0.3,
    peso_tendencia: 0.3,
    peso_preco: 0.4,
    peso_avaliacao: 1.0,
    prob_compra_base: 0.10,
    peso_volume_avaliacoes: 0.4, // confia mais quando tem MUITAS avaliacoes
  },
};

const COMENTARIOS = {
  5: [
    'Superou minhas expectativas, recomendo demais.',
    'Excelente custo-beneficio, vou comprar de novo.',
    'Exatamente o que eu precisava, entrega perfeita.',
  ],
  4: [
    'Muito bom, so senti falta de mais detalhes em uma parte.',
    'Valeu o investimento, cumpriu o prometido.',
    'Gostei bastante, ficaria com 5 estrelas se fosse um pouco mais completo.',
  ],
  3: [
    'Ok, mas esperava um pouco mais pelo preco.',
    'Cumpre o basico, nada excepcional.',
    'Mediano, pode melhorar em alguns pontos.',
  ],
  2: [
    'Abaixo do que eu esperava, tive dificuldade em usar.',
    'Nao correspondeu a descricao em alguns pontos.',
    'Achei fraco para o preco cobrado.',
  ],
  1: [
    'Nao recomendo, muito abaixo da qualidade esperada.',
    'Me arrependi da compra.',
    'Descricao nao bate com o que foi entregue.',
  ],
};

function comentarioAleatorio(rating) {
  const bucket = COMENTARIOS[rating] || COMENTARIOS[3];
  return bucket[Math.floor(Math.random() * bucket.length)];
}

module.exports = { PERFIS, comentarioAleatorio };
