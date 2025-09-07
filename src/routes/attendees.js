const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/mssql');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const { sendMail } = require('../services/mailer');

/**
 * POST /api/attendees
 * Body:
 * {
 *   "nombre": "Juan Pérez",
 *   "email": "juan@x.com",
 *   "telefono": "+502...",
 *   "asisteIglesia": true,
 *   "iglesiaNombre": "Iglesia Vida",
 *   "sourceCode": "facebook" | "instagram" | "casa_oracion" | "amigo_familiar" | "iglesia_casa_de_elias" | "otro",
 *   "sourceOtherText": null,
 *   "esEquipoCasaDeElias": true,
 *   "equipos": ["servidores","medios"]
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      email,
      telefono,
      asisteIglesia,
      iglesiaNombre,
      sourceCode,
      sourceOtherText,
      esEquipoCasaDeElias,
      equipos
    } = req.body;

    // Validaciones mínimas (el SP también valida)
    if (!nombre || !sourceCode) {
      return res.status(400).json({ error: 'nombre y sourceCode son obligatorios' });
    }
    if (asisteIglesia === true && !iglesiaNombre) {
      return res.status(400).json({ error: 'iglesiaNombre es obligatorio cuando asisteIglesia=true' });
    }
    if (sourceCode === 'otro' && !sourceOtherText) {
      return res.status(400).json({ error: 'sourceOtherText es obligatorio cuando sourceCode="otro"' });
    }
    if (esEquipoCasaDeElias === true && (!equipos || equipos.length === 0)) {
      return res.status(400).json({ error: 'Debes enviar al menos un equipo cuando esEquipoCasaDeElias=true' });
    }

    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : null;
    const teamsCsv = Array.isArray(equipos) ? equipos.join(',') : null;

    const pool = await getPool();

    // Llamada al Stored Procedure
    const result = await pool.request()
      .input('full_name',              sql.NVarChar(150), nombre)
      .input('email',                  sql.NVarChar(254), emailNorm)
      .input('phone',                  sql.NVarChar(30),  telefono || null)
      .input('attends_church',         sql.Bit,           !!asisteIglesia)
      .input('church_name',            sql.NVarChar(200), iglesiaNombre || null)
      .input('source_code',            sql.VarChar(50),   sourceCode)
      .input('source_other_text',      sql.NVarChar(200), sourceOtherText || null)
      .input('is_house_of_elias_team', sql.Bit,           !!esEquipoCasaDeElias)
      .input('teams_csv',              sql.NVarChar(500), teamsCsv)
      .execute('evt.usp_RegisterAttendee');

    const attendeeId = result?.recordset?.[0]?.attendee_id;
    if (!attendeeId) {
      return res.status(500).json({ error: 'No se obtuvo attendee_id del SP.' });
    }

    // -------- QR con URL firmada para check-in --------
    if (!process.env.QR_SECRET) {
      console.error('Falta QR_SECRET en env');
      return res.status(500).json({ error: 'Config faltante: QR_SECRET' });
    }

    const token = jwt.sign(
      { sub: attendeeId, typ: 'attendee', act: 'checkin' },
      process.env.QR_SECRET,
      { expiresIn: '7d' } // ajusta si quieres
    );

   let baseUrl = process.env.PUBLIC_BASE_URL2|| `http://localhost:${process.env.PORT || 3000}`;

if (!/^https?:\/\//i.test(baseUrl)) {
  baseUrl = `https://${baseUrl}`;
}
const checkinUrl = `${baseUrl}/api/checkin?token=${encodeURIComponent(token)}`;


    // Genera el QR a partir de la URL de check-in
    const qrBuffer = await QRCode.toBuffer(checkinUrl, {
      type: 'png',
      width: 512,
      errorCorrectionLevel: 'H',
      margin: 2
    });

    // Enviar correo con el QR
    if (emailNorm) {
      await sendMail({
        to: emailNorm,
        subject: 'Registro confirmado',
        html: `
          <p>Hola ${nombre},</p>
          <p>Tu registro fue recibido. Adjuntamos el <b>QR de asistencia</b>.</p>
          <p>Al escanearlo, confirmará tu asistencia en el sistema.</p>
          <p><small>ID: <b>${attendeeId}</b></small></p>
        `,
        attachments: [
          {
            filename: `checkin-${attendeeId}.png`,
            content: qrBuffer,
            contentType: 'image/png'
          }
        ]
      });
    }

    return res.status(201).json({
      ok: true,
      attendeeId,
      checkinUrl,
      email_enviado: !!emailNorm
    });

  } catch (e) {
    console.error('Error registrando asistente:', e);
    const msg = e.originalError?.message || e.message || 'Error interno';
    return res.status(400).json({ error: msg });
  }
});

module.exports = router;
