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


    const baseUrl =
      process.env.PUBLIC_BASE_URL2 ||
      'https://backendeventoticket-production.up.railway.app';

    const checkinUrl = `${baseUrl}/api/checkin?token=${encodeURIComponent(token)}`;


    const qrBuffer = await QRCode.toBuffer(checkinUrl, {
      type: 'png',
      width: 512,
      errorCorrectionLevel: 'H',
      margin: 2
    });


    let emailError = null;
   if (emailNorm) {
  try {
    await sendMail({
      to: emailNorm,
      subject: 'Confirmación de registro – Congreso El León Ruge 2025',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color:#b22222; text-align:center; margin-bottom: 10px;">
            Congreso <span style="font-weight: bold;">El León Ruge 2025</span>
          </h2>
          <p>Hola <b>${nombre}</b>,</p>
          <p>¡Gracias por registrarte! 🙌<br/>
          Tu asistencia al <b>Congreso El León Ruge 2025: "Comprados con sangre"</b> ha quedado confirmada.</p>

          <p style="margin: 20px 0; font-size: 15px;">
            📍 <b>Lugar:</b> Iglesia La Casa de Elías Internacional<br/>
            1-83 7a. Avenida, Colonia Cotío, Zona 2 Mixco
          </p>

          <p style="margin: 20px 0; font-size: 15px;">
            📅 <b>Fecha:</b> Sábado 18 de octubre de 2025
          </p>

          <p>
            Adjuntamos tu <b>código QR personal de asistencia</b>.<br/>
            👉 Al presentarlo en la entrada, se confirmará automáticamente tu registro.
          </p>

          <p style="margin-top: 30px; font-style: italic;">
            ✨ Te esperamos con mucha alegría para vivir juntos este tiempo de palabra, adoración y unidad en Cristo.
          </p>

          <p style="margin-top: 30px;">
            Bendiciones,<br/>
            <b>Casa de Elías Internacional</b><br/>
            Congreso El León Ruge 2025
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `checkin-${attendeeId}.png`,
          content: qrBuffer // Buffer → mailer.js lo convierte
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
