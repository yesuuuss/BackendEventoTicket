const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); 
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,

  lookup: (hostname, opts, cb) => {
    dns.lookup(hostname, { family: 4, all: false }, cb);
  }
});

module.exports = pool;
