// src/services/mailer.js
require('dotenv').config();
const axios = require('axios');

const FROM_EMAIL    = process.env.FROM_EMAIL;
const FROM_NAME     = process.env.FROM_NAME || 'Evento Tickets';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

function normalizeToBase64(input) {
  if (!input) throw new Error('Attachment vacío');
  if (Buffer.isBuffer(input)) return input.toString('base64'); // Buffer → base64
  if (typeof input === 'string') {
    // Quita prefijo si viene como data URL
    return input.replace(/^data:.*;base64,/, '');
  }
  throw new Error('Attachment no es Buffer ni string base64');
}

function normalizeAttachments(attachments) {
  if (!attachments || !attachments.length) return undefined;
  return attachments.map(a => ({
    name: a.name || a.filename || 'adjunto',
    content: normalizeToBase64(a.content)
  }));
}

/**
 * Enviar correo vía Brevo API v3
 * @param {{to:string|string[], subject:string, html?:string, text?:string, attachments?:{name?:string, filename?:string, content:Buffer|string}[]}} p
 */
async function sendMail({ to, subject, html, text, attachments }) {
  if (!to) throw new Error('Destinatario "to" es requerido');
  if (!BREVO_API_KEY) throw new Error('Falta BREVO_API_KEY');
  if (!FROM_EMAIL) throw new Error('Falta FROM_EMAIL');

  const toArray = Array.isArray(to) ? to : [to];
  const payload = {
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: toArray.map(email => ({ email })),
    subject,
    htmlContent: html,
    textContent: text
  };

  const brevoAttachments = normalizeAttachments(attachments);
  if (brevoAttachments) payload.attachment = brevoAttachments;

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
    const code = err.response?.status || err.code;
    const msg  = err.response?.data || err.message;
    console.error('[MailerError][brevo-api]', code, msg);
    throw new Error(`Brevo API error: ${code}`);
  }
}

module.exports = { sendMail };
