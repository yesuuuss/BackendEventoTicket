const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS (ajusta origins si ya tienes front en Netlify/otro)
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health genérico
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Home
app.get('/', (_req, res) => {
  res.send('API de Tickets funcionando 🚀');
});

// Health DB (Postgres) - tu pool actual
const pool = require('./config/db');
app.get('/health/db', async (_req, res) => {
  try {
    const r = await pool.query('SELECT now() as now');
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Rutas de negocio (Postgres - ya existente)
const ticketRoutes = require('./routes/tickets');
app.use('/api/tickets', ticketRoutes);

// Nueva ruta: asistentes (SQL Server)
const attendeeRoutes = require('./routes/attendees');
app.use('/api/attendees', attendeeRoutes);

// Nueva ruta: check-in (marca asistencia al leer el QR)
const checkinRoutes = require('./routes/checkin');
app.use('/api/checkin', checkinRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
  console.log('PUBLIC_BASE_URL:', process.env.PUBLIC_BASE_URL2);

app.use('/api/_test/sql', require('./routes/_test-sql'));

});
