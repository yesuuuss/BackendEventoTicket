// src/routes/attendees.js
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/mssql');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const { sendMail } = require('../services/mailer');

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

    // Validaciones mínimas
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
    const phoneNorm = typeof telefono === 'string' ? telefono.replace(/\s+/g, '') : telefono || null;
    const teamsCsv = Array.isArray(equipos) ? equipos.join(',') : null;

    const pool = await getPool();

    // SP
    const result = await pool.request()
      .input('full_name',              sql.NVarChar(150), nombre)
      .input('email',                  sql.NVarChar(254), emailNorm)
      .input('phone',                  sql.NVarChar(30),  phoneNorm)
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
      { expiresIn: '7d' }
    );

    // PRODUCCIÓN: forzar siempre https y PUBLIC_BASE_URL2
    const baseUrl =
      process.env.PUBLIC_BASE_URL2 ||
      'https://backendeventoticket-production.up.railway.app';

    const checkinUrl = `${baseUrl}/api/checkin?token=${encodeURIComponent(token)}`;

    // Genera el QR (Buffer)
    const qrBuffer = await QRCode.toBuffer(checkinUrl, {
      type: 'png',
      width: 512,
      errorCorrectionLevel: 'H',
      margin: 2
    });

    // Enviar correo (si falla email, igual registramos)
    let emailError = null;
    if (emailNorm) {
      try {
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
              content: qrBuffer // <-- Buffer; el mailer lo convierte a Base64
            }
          ]
        });
      } catch (err) {
        console.error('Fallo envío de correo:', err?.response?.data || err.message || err);
        emailError = 'Fallo al enviar correo';
      }
    }

    return res.status(201).json({
      ok: true,
      attendeeId,
      checkinUrl,
      email_enviado: !!emailNorm && !emailError,
      ...(emailError ? { email_error: emailError } : {})
    });

  } catch (e) {
    console.error('Error registrando asistente:', e);
    const msg = e.originalError?.message || e.message || 'Error interno';
    return res.status(400).json({ error: msg });
  }
});

module.exports = router;
