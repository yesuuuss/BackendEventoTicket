const { Client } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Solo una vez al principio

// Conexión a la base de datos de Supabase usando la URL proporcionada
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // Desactiva la validación SSL si es necesario (para producción, se recomienda usar SSL)
});

client.connect()
  .then(() => {
    console.log('Conectado a la base de datos!');
    client.end(); // Termina la conexión después de la verificación
  })
  .catch((error) => {
    console.error('Error al conectar a la base de datos:', error);
  });

// Configuración de transporte de correos usando Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',  // Convierte a booleano si es necesario
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
