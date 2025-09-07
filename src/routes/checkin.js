const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../config/mssql');

/**
 * GET /api/checkin?token=...
 * Verifica token, marca asistencia (si no estaba marcada) y responde estado.
 */
router.get('/', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Falta token');

    let payload;
    try {
      payload = jwt.verify(token, process.env.QR_SECRET);
    } catch (e) {
      return res.status(401).send('Token inválido o expirado');
    }

    if (payload.typ !== 'attendee' || payload.act !== 'checkin') {
      return res.status(400).send('Token no válido para check-in');
    }

    const attendeeId = Number(payload.sub);
    if (!attendeeId) return res.status(400).send('Token sin ID válido');

    const pool = await getPool();

    // Trae el estado actual
    const result = await pool.request()
      .input('attendee_id', sql.BigInt, attendeeId)
      .query(`
        SELECT attendee_id, full_name, attendance_confirmed, attendance_confirmed_at
        FROM evt.Attendee WHERE attendee_id = @attendee_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).send('Asistente no encontrado');
    }

    const row = result.recordset[0];

    // Si no estaba confirmado, confírmalo ahora (idempotente)
    if (!row.attendance_confirmed) {
      await pool.request()
        .input('attendee_id', sql.BigInt, attendeeId)
        .query(`
          UPDATE evt.Attendee
          SET attendance_confirmed = 1,
              attendance_confirmed_at = SYSUTCDATETIME()
          WHERE attendee_id = @attendee_id
        `);
    }

    // Respuesta “humana” (puedes cambiar a JSON si prefieres)
    const confirmado = row.attendance_confirmed ? 'YA CONFIRMADA' : 'CONFIRMADA AHORA';
    const cuando = row.attendance_confirmed_at || new Date();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <html>
        <head><meta charset="utf-8"><title>Asistencia</title></head>
        <body style="font-family: sans-serif">
          <h2>✅ Asistencia ${confirmado}</h2>
          <p><b>ID:</b> ${attendeeId}</p>
          <p><b>Nombre:</b> ${row.full_name}</p>
          <p><b>Fecha/hora:</b> ${new Date(cuando).toISOString()}</p>
        </body>
      </html>
    `);
  } catch (e) {
    console.error('Checkin error:', e);
    return res.status(500).send('Error interno');
  }
});

module.exports = router;
