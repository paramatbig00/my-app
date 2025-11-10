const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "my-postgres",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "123456",
  database: process.env.DB_NAME || "my_app_db",
  port: process.env.DB_PORT || 5432,
});

module.exports = { pool };


// ฟังก์ชันสร้าง table ที่จำเป็น
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id SERIAL PRIMARY KEY,
        userId VARCHAR(50) UNIQUE NOT NULL,
        citizenId VARCHAR(13) UNIQUE NOT NULL,
        firstname VARCHAR(100) NOT NULL,
        lastname VARCHAR(100) NOT NULL,
        mobile VARCHAR(15),
        email VARCHAR(100)
      );
    `);

    console.log("✅ Tables 'logs' and 'User' are ready.");
  } catch (err) {
    console.error(" Database initialization failed:", err);
  }
};

module.exports = { pool, initDB };
