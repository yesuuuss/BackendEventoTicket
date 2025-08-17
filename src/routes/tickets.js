const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { sendMail } = require('../services/mailer'); // <-- usa tu mailer.js

// Crear ticket -> Generar QR -> Enviar correo
router.post('/', async (req, res) => {
  const { nombre, email } = req.body;

  if (!nombre || !email) {
    return res.status(400).json({ error: 'nombre y email son obligatorios' });
  }

  const codigo = uuidv4(); // será el valor del QR

  try {
    // 1) Insertar en BD
    const { rows } = await pool.query(
      'INSERT INTO tickets (nombre, email, codigo) VALUES ($1, $2, $3) RETURNING *',
      [nombre, email, codigo]
    );
    const ticket = rows[0];

    // 2) Generar QR en PNG (buffer en memoria)
    const qrBuffer = await QRCode.toBuffer(ticket.codigo, {
      type: 'png',
      width: 512,
      errorCorrectionLevel: 'H',
      margin: 2
    });

    // 3) Enviar correo con el QR adjunto
    await sendMail({
      to: ticket.email,
      subject: 'Tu ticket de acceso (QR)',
      html: `
        <p>Hola ${ticket.nombre},</p>
        <p>Adjuntamos tu <b>ticket de acceso</b>. Presenta el QR el día del evento.</p>
        <p><small>Código: <code>${ticket.codigo}</code></small></p>
      `,
      attachments: [
        {
          filename: `ticket-${ticket.codigo}.png`,
          content: qrBuffer,
          contentType: 'image/png'
        }
      ]
    });

    return res.status(201).json({
      ok: true,
      ticket,
      email_enviado: true
    });
  } catch (e) {
    console.error('Error en creación/envío:', e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
