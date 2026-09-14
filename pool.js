const { Pool } = require('pg');

// No Railway a variavel DATABASE_URL ja vem pronta.
// Local, defina no .env (veja .env.example).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});

module.exports = { pool };
