// src/services/mailer.js
require('dotenv').config();
const axios = require('axios');

const FROM_EMAIL    = process.env.FROM_EMAIL;
const FROM_NAME     = process.env.FROM_NAME || 'Evento Tickets';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

/**
 * Enviar correo vía Brevo API v3 (HTTPS:443)
 * @param {{to:string|string[], subject:string, html?:string, text?:string, attachments?:{name:string, content:string}[]}} p
 *  - attachments.content debe ir en Base64 si adjuntas archivos
 */
async function sendMail({ to, subject, html, text, attachments }) {
  if (!to) throw new Error('Destinatario "to" es requerido');

  const payload = {
    to: (Array.isArray(to) ? to : [to]).map(email => ({ email })),
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    htmlContent: html,
    textContent: text,
    attachment: attachments
  };

  try {
    const { data } = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      payload,
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        },
        timeout: 15000
      }
    );

    return {
      ok: true,
      provider: 'brevo-api',
      messageId: data?.messageId || data?.messageIds?.[0]
    };
  } catch (err) {
    // Log útil y claro
    const code = err.response?.status || err.code;
    const msg  = err.response?.data || err.message;
    console.error('[MailerError][brevo-api]', code, msg);
    throw new Error(`Brevo API error: ${code}`);
  }
}

module.exports = { sendMail };
