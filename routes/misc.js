const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar categorias.' });
  }
});

// GET /api/companies -> lista (para o seletor "logar como empresa" enquanto nao ha auth)
router.get('/companies', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, logo_url, reputation, balance_cents FROM companies ORDER BY created_at');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar empresas.' });
  }
});

// POST /api/companies -> criar empresa
router.post('/companies', async (req, res) => {
  try {
    const { name, description, logo_url } = req.body;
    if (!name) return res.status(400).json({ erro: 'name e obrigatorio.' });
    const { rows } = await pool.query(
      'INSERT INTO companies (name, description, logo_url) VALUES ($1,$2,$3) RETURNING *',
      [name, description || null, logo_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar empresa.' });
  }
});

// GET /api/companies/:id -> pagina da empresa
router.get('/companies/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Empresa nao encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar empresa.' });
  }
});

module.exports = router;
