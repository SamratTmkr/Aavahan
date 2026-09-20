import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
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
    console.error('--- DATABASE CONNECTION ERROR ---');
    console.error(`Message: ${error.message}`);
    console.error(`Code: ${error.code}`);
    console.error(`Target: ${process.env.DB_USER || 'aavahan_user'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME || 'aavahan'}`);
    console.error(`SSL enabled: ${process.env.DB_SSL || 'false'}`);
    console.error('---------------------------------');
    process.exit(1);
  }
};

export default pool;
