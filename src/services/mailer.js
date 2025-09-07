// src/services/mailer.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 2525); 
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const FROM_EMAIL = process.env.FROM_EMAIL;
const FROM_NAME  = process.env.FROM_NAME || 'Evento Tickets';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,           
  requireTLS: true,      
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  family: 4,                
  pool: true,
  maxConnections: 2,
  maxMessages: 50,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
  tls: {
    servername: 'smtp-relay.brevo.com',
    rejectUnauthorized: true
  }
});

/**
 * Enviar correo
 * @param {{to:string, subject:string, html?:string, text?:string, attachments?:Array}} p
 */
async function sendMail({ to, subject, html, text, attachments }) {
  if (!to) throw new Error('Destinatario "to" es requerido');

  try {
    const info = await transporter.sendMail({
      from: FROM_NAME ? `${FROM_NAME} <${FROM_EMAIL}>` : FROM_EMAIL,
      to,
      subject,
      html,
      text,
      attachments
    });
    return { ok: true, provider: 'brevo-smtp', messageId: info.messageId };
  } catch (err) {
    console.error('[MailerError]', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      code: err.code,
      command: err.command,
      message: err.message
    });
    throw err;
  }
}


async function verifyMailer() {
  try {
    await transporter.verify();
    console.log('SMTP listo (Brevo 2525)');
  } catch (err) {
    console.error('Fallo verify SMTP:', err.code || '', err.message);
  }
}

module.exports = { sendMail, verifyMailer };
