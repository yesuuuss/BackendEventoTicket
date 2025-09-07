// src/index.js
require('dotenv').config();
function assertEnv(name) {
  if (!process.env[name]) {
    console.warn(`[WARN] Falta variable de entorno: ${name}`);
  }
}
['PUBLIC_BASE_URL', 'BREVO_API_KEY', 'FROM_EMAIL'].forEach(assertEnv);

const express = require('express');
const cors = require('cors');

const app = express();

/* === Config básica === */
app.set('trust proxy', 1); // Railway/NGINX
app.use(cors());           // ajusta origin en producción
app.use(express.json({ limit: '1mb' }));

/* === Health genérico === */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* === Home === */
app.get('/', (_req, res) => res.send('API de Tickets funcionando 🚀'));

/* === Health DB (MSSQL) — ajusta si usas Postgres === */
const sql = require('mssql'); // asegúrate de tenerlo en package.json
const db = require('./config/mssql'); // tu módulo de conexión MSSQL (usa variables del .env)

app.get('/health/db', async (_req, res) => {
  try {
    // Conexión y simple SELECT para MSSQL
    const pool = await db.getPool();         // asume que exportas getPool() en config/mssql.js
    const result = await pool.request().query('SELECT GETDATE() AS now');
    res.json({ ok: true, now: result.recordset[0].now });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* === Rutas de negocio === */
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/attendees', require('./routes/attendees'));
app.use('/api/checkin', require('./routes/checkin'));

/* === Rutas utilitarias / pruebas === */
app.use('/api/_test/sql', require('./routes/_test-sql'));

// Diagnóstico de email (usa services/mailer.js por API Brevo)
app.use('/diagnostics', require('./routes/_diagnostics')); 
// crea src/routes/_diagnostics.js como te pasé antes

/* === Jobs de boot No-bloqueantes (NO deben tumbar el server) === */
async function initBootJobs() {
  try {
    // ejemplo: registrar asistente o precargar algo
    // IMPORTANT: Si aquí envías correo, usa try/catch interno también.
  } catch (err) {
    console.error('Error en boot (no fatal):', err.message);
  }
}
initBootJobs();

/* === Handlers globales para evitar caída por promesas === */
process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
});

/* === Start server === */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
  console.log('PUBLIC_BASE_URL:', process.env.PUBLIC_BASE_URL); // unificado
});
