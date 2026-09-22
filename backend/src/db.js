import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'aavahan',
  user: process.env.DB_USER || 'aavahan_user',
  password: process.env.DB_PASSWORD || 'aavahan_pass',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const connectToDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`Connected to database in ${process.env.NODE_ENV || 'development'} mode`);
    connection.release();
  } catch (error) {
    console.error('Could not connect to the database.');
    console.error(`  ${error.code || 'ERROR'}: ${error.message}`);
    console.error(`  tried ${process.env.DB_USER || 'aavahan_user'}@${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME || 'aavahan'}`);
    process.exit(1);
  }
};

export default pool;
