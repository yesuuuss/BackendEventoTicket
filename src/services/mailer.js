// src/services/mailer.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: { servername: 'smtp-relay.sendinblue.com' } // útil con Brevo
});

const FROM_EMAIL = process.env.FROM_EMAIL;
const FROM_NAME  = process.env.FROM_NAME || 'Evento Tickets';

/**
 * Enviar correo (misma firma que usas en attendees.js)
 * @param {{to:string, subject:string, html:string, attachments?:Array}} param0
 */
async function sendMail({ to, subject, html, attachments }) {
  if (!to) throw new Error('Destinatario "to" es requerido');

  await transporter.sendMail({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    attachments
  });
}

module.exports = { sendMail };
