require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,   // p.ej. EventoTicket.mssql.somee.com
  // 👇 fuerza el puerto de SQL Server
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  // 👇 subimos tiempos por latencia entre Railway ↔ somee
  connectionTimeout: 30000, // 30s para abrir conexión
  requestTimeout: 30000,    // 30s por consulta
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

// Pequeño retry con backoff
async function connectWithRetry(attempt = 1) {
  try {
    return await sql.connect(config);
  } catch (err) {
    if (attempt >= 3) throw err;
    const wait = attempt * 1500;
    console.warn(`SQL connect error (attempt ${attempt}) -> retry in ${wait}ms:`, err.code || err.message);
    await new Promise(r => setTimeout(r, wait));
    return connectWithRetry(attempt + 1);
  }
}

async function getPool() {
  if (pool && pool.connected) return pool;
  pool = await connectWithRetry();
  return pool;
}

module.exports = { sql, getPool };
    