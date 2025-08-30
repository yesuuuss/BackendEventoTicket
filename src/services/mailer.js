const nodemailer = require('nodemailer');
require('dotenv').config();

const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const port = Number(process.env.SMTP_PORT || 587);
const secure = String(process.env.SMTP_SECURE ?? (port === 465)).toLowerCase() === 'true';

const transporter = nodemailer.createTransport({
  host,
  port,
  secure, // false con 587, true con 465
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { minVersion: 'TLSv1.2', servername: host },
  connectionTimeout: 15000,
});

async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: `"${process.env.FROM_NAME || 'Tickets'}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail, transporter };
