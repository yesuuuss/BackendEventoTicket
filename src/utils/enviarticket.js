const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
require('dotenv').config();

/**
 * Envía un correo con el QR del ticket adjunto (PNG).
 * @param {Object} ticket { nombre, email, codigo }
 */
async function enviarTicket(ticket) {
  const { nombre, email, codigo } = ticket;

  // 1) Transporter SMTP (Brevo)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,              // p.ej. smtp-relay.brevo.com
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,            // p.ej. 946d5d001@smtp-brevo.com
      pass: process.env.SMTP_PASS
    },
    // En algunos entornos Brevo presenta CN de sendinblue; esto ayuda a SNI
    tls: { servername: 'smtp-relay.sendinblue.com' }
  });

  // (Opcional) Verificar conexión SMTP una sola vez
  // await transporter.verify();

  // 2) Generar QR como buffer PNG
  const qrBuffer = await QRCode.toBuffer(codigo, {
    type: 'png',
    width: 512,
    errorCorrectionLevel: 'H',
    margin: 2
  });

  // 3) Enviar correo
  const fromEmail = process.env.FROM_EMAIL;   // remitente verificado en Brevo
  const fromName  = process.env.FROM_NAME || 'Tickets Evento';

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: email,
    subject: 'Tu ticket de acceso (QR)',
    html: `
      <p>Hola ${nombre},</p>
      <p>Gracias por registrarte. Adjuntamos tu <b>ticket de acceso</b>.</p>
      <p><small>Código: <code>${codigo}</code></small></p>
      <p>Preséntalo el día del evento.</p>
    `,
    attachments: [
      {
        filename: `ticket-${codigo}.png`,
        content: qrBuffer,
        contentType: 'image/png'
      }
    ]
  });
}

module.exports = { enviarTicket };
