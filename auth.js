const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

// POST /api/auth/login  { email }
// Login simples por e-mail: se o e-mail nao existe, cria o usuario E a empresa
// dele. Cada e-mail tem a propria empresa, entao um jogador nunca mexe nos
// dados de outro (antes todo mundo caia na mesma empresa).
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ erro: 'Informe um e-mail valido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existente = await client.query(
      `SELECT u.id, u.email, u.company_id, c.name AS company_name
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1`,
      [email]
    );

    if (existente.rows.length > 0 && existente.rows[0].company_id) {
      await client.query('UPDATE users SET last_login = now() WHERE id = $1', [existente.rows[0].id]);
      await client.query('COMMIT');
      return res.json({ ...existente.rows[0], novo: false });
    }

    // cria empresa propria do jogador
    const empresa = await client.query(
      `INSERT INTO companies (name, description, is_bot)
       VALUES ($1, $2, false) RETURNING id, name`,
      [`Empresa de ${email.split('@')[0]}`, 'Nova empresa no marketplace.']
    );

    let userId;
    if (existente.rows.length > 0) {
      userId = existente.rows[0].id;
      await client.query('UPDATE users SET company_id = $1, last_login = now() WHERE id = $2', [empresa.rows[0].id, userId]);
    } else {
      const novo = await client.query(
        'INSERT INTO users (email, company_id, last_login) VALUES ($1,$2,now()) RETURNING id',
        [email, empresa.rows[0].id]
      );
      userId = novo.rows[0].id;
    }

    await client.query('COMMIT');
    res.json({
      id: userId,
      email,
      company_id: empresa.rows[0].id,
      company_name: empresa.rows[0].name,
      novo: true,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao entrar.' });
  } finally {
    client.release();
  }
});

module.exports = router;
