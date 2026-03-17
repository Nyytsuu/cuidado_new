// db/pool.js
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "root123",
  database: process.env.DB_NAME || "cuidado_medihelp",
  port: Number(process.env.DB_PORT || 3307
    
  ),
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;