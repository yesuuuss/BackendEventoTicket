const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('ENV DATABASE_URL cargada:', !!process.env.DATABASE_URL);

const app = express();
app.use(cors()); // luego lo restringimos a Netlify
app.use(express.json({ limit: '1mb' }));

// Health genérico (para LB/monitoreo)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Home
app.get('/', (req, res) => {
  res.send('API de Tickets funcionando 🚀');
});

// Health DB
const pool = require('./config/db');
app.get('/health/db', async (req, res) => {
  try {
    const r = await pool.query('SELECT now() as now');
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Rutas de negocio
const ticketRoutes = require('./routes/tickets');
app.use('/api/tickets', ticketRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
