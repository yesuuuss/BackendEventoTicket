const { Client } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Solo una vez al principio

// Conexión a la base de datos de Supabase usando la URL proporcionada
const { Client } = require('pg');
require('dotenv').config();


const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },  // Asegúrate de que SSL esté habilitado
});

client.connect()
  .then(() => {
    console.log('Conectado a la base de datos!');
    client.end();
  })
  .catch((error) => {
    console.error('Error al conectar a la base de datos:', error);
  });

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',  
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Función para enviar correos
async function sendMail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('Correo enviado:', info);
    return info;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    throw new Error('No se pudo enviar el correo. Intenta más tarde.');
  }
}

module.exports = { sendMail, transporter };
