const express = require('express');
const { pool } = require('../db/pool');
const { rodarCiclo } = require('../simulation/engine');

const router = express.Router();

// GET /api/simulation/status
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM simulation_state WHERE id = true');
    res.json(rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao ler status da simulacao.' });
  }
});

// POST /api/simulation/tick -> forca um ciclo agora (util para testar sem esperar o timer)
router.post('/tick', async (req, res) => {
  try {
    const resultado = await rodarCiclo();
    res.json({ ok: true, ...resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao rodar ciclo de simulacao.' });
  }
});

module.exports = router;
