require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    // necessario para gen_random_uuid()
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await client.query(schema);

    // cria uma empresa padrao se ainda nao existir nenhuma,
    // so para o jogador ja poder criar produtos sem precisar
    // de tela de cadastro (login/multi-empresa vem em fase futura)
    const { rows } = await client.query('SELECT id FROM companies LIMIT 1');
    if (rows.length === 0) {
      await client.query(
        `INSERT INTO companies (name, description) VALUES ($1, $2)`,
        ['Minha Empresa', 'Empresa criada automaticamente na primeira execucao.']
      );
      console.log('Empresa padrao criada.');
    }

    console.log('Banco inicializado com sucesso.');
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch((err) => {
  console.error('Erro ao inicializar banco:', err);
  process.exit(1);
});
