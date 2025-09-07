const sql = require('mssql');
require('dotenv').config(); // Solo una vez al principio
console.log('DB_SERVER:', process.env.DB_SERVER);


// Configuración de la conexión a SQL Server usando las variables de entorno
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,  // Este debe ser un string válido
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
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

