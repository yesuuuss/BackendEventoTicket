const express = require('express');
const router = express.Router();
const { getPool } = require('../config/mssql');

router.get('/', async (_req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query('SELECT TOP 1 GETUTCDATE() AS utc_now;');
    return res.json({ ok: true, utc_now: r.recordset[0].utc_now });
  } catch (e) {
    console.error('TEST SQL ERR:', e);
    return res.status(500).json({
      ok: false,
      code: e.code,
      name: e.name,
      message: e.message
    });
  }
});

module.exports = router;
