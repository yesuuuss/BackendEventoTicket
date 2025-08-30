const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); 

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,      
  ssl: { require: true, rejectUnauthorized: false }
});

module.exports = pool;
