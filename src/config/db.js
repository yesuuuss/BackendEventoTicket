const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,        
  ssl: { require: true, rejectUnauthorized: false }, 

  lookup: (hostname, options, cb) =>
    dns.lookup(hostname, { ...options, family: 4 }, cb),
});

module.exports = pool;
