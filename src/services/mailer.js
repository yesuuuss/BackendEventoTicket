const sql = require('mssql');
require('dotenv').config(); // Solo una vez al principio

// Configuración de la conexión a SQL Server usando las variables de entorno
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, // Nombre del servidor o IP de la base de datos
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true, // Para conexiones seguras, por ejemplo con Azure
    trustServerCertificate: true, // Puedes deshabilitar esto en producción si es necesario
  }
};

// Conexión a la base de datos
sql.connect(config)
  .then(pool => {
    console.log('Conectado a la base de datos SQL Server!');
    return pool; // Aquí puedes hacer tus consultas
  })
  .catch(error => {
    console.error('Error al conectar a la base de datos:', error);
  });

