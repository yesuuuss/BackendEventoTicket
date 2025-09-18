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


app.set('trust proxy', 1); 
app.use(cors());           
app.use(express.json({ limit: '1mb' }));


app.get('/api/health', (_req, res) => res.json({ ok: true }));


app.get('/', (_req, res) => res.send('API de Tickets funcionando'));


const sql = require('mssql'); 
const db = require('./config/mssql'); 

app.get('/health/db', async (_req, res) => {
  try {
 
    const pool = await db.getPool();        
    const result = await pool.request().query('SELECT GETDATE() AS now');
    res.json({ ok: true, now: result.recordset[0].now });
  } catch (e) {
    console.error('DB health error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/attendees', require('./routes/attendees'));
app.use('/api/checkin', require('./routes/checkin'));


app.use('/api/_test/sql', require('./routes/_test-sql'));


app.use('/diagnostics', require('./routes/_diagnostics')); 



async function initBootJobs() {
  try {
    
    
  } catch (err) {
    console.error('Error en boot (no fatal):', err.message);
  }
}
initBootJobs();


process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
  console.log('PUBLIC_BASE_URL:', process.env.PUBLIC_BASE_URL2);
});
