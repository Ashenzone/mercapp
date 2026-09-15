 const { Pool } = require('pg'); const url = process.env.DATABASE_URL || ''; const isLocal = /localhost|127\.0\.0\.1/.test(url); const pool = new Pool({ connectionString: url, ssl: url && !isLocal ? { rejectUnauthorized: false } : false, }); module.exports = { pool };

