require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const productsRouter = require('./routes/products');
const miscRouter = require('./routes/misc');
const trendsRouter = require('./routes/trends');
const campaignsRouter = require('./routes/campaigns');
const ordersReviewsRouter = require('./routes/orders');
const analyticsRouter = require('./routes/analytics');
const rankingRouter = require('./routes/ranking');
const simulationRouter = require('./routes/simulation');

const { iniciarLoopDeSimulacao } = require('./simulation/engine');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/products', productsRouter);
app.use('/api/trends', trendsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ranking', rankingRouter);
app.use('/api/simulation', simulationRouter);
app.use('/api', ordersReviewsRouter); // /api/orders/... e /api/reviews/...
app.use('/api', miscRouter);          // /api/categories e /api/companies

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Mercapp rodando em http://localhost:${PORT}`);
  // motor de simulacao roda em background mesmo sem ninguem usando a interface,
  // como pedido: tendencias mudam, bots compram e avaliam, campanhas consomem verba.
  const intervalo = Number(process.env.SIMULATION_TICK_MS) || 20000;
  iniciarLoopDeSimulacao(intervalo);
});
