import bcrypt from 'bcryptjs';
import pool from '../src/db.js';

async function init() {
  console.log('Creating tables...');

  // Users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(120) NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          VARCHAR(20) DEFAULT 'user',
      avatar_url    TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('users table ready');

  // Groups
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`groups\` (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(200) NOT NULL,
      description   TEXT,
      category      VARCHAR(80),
      city          VARCHAR(100) NOT NULL,
      avatar_url    TEXT,
      is_public     BOOLEAN DEFAULT TRUE,
      member_count  INTEGER DEFAULT 0,
      organizer_id  INT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log('groups table ready');

  // Events
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      title           VARCHAR(300) NOT NULL,
      description     TEXT,
      category        VARCHAR(80),
      venue           VARCHAR(200),
      address         TEXT,
      city            VARCHAR(100),
      country         VARCHAR(80) DEFAULT 'Nepal',
      event_date      DATE NOT NULL,
      start_time      TIME,
      end_time        TIME,
      is_free         BOOLEAN DEFAULT TRUE,
      min_price       DECIMAL(10,2) DEFAULT 0,
      currency        VARCHAR(10) DEFAULT 'NPR',
      is_online       BOOLEAN DEFAULT FALSE,
      capacity        INTEGER,
      attendee_count  INTEGER DEFAULT 0,
      group_id        INT,
      organizer_id    INT,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE SET NULL,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log('events table ready');

  // RSVPs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      event_id       INT NOT NULL,
      user_id        INT NOT NULL,
      status         VARCHAR(20) DEFAULT 'confirmed',
      checked_in_at  TIMESTAMP NULL,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('rsvps table ready');

  // Seed default demo user and admin if not present
  const hash1 = await bcrypt.hash('user123', 10);
  const hash2 = await bcrypt.hash('admin123', 10);

  const [existingUser] = await pool.execute('SELECT id FROM users WHERE email = ?', ['user@aavahan.com']);
  if (existingUser.length === 0) {
    await pool.execute('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Demo User', 'user@aavahan.com', hash1, 'user']);
    console.log('Seeded demo user: user@aavahan.com');
  }

  const [existingAdmin] = await pool.execute('SELECT id FROM users WHERE email = ?', ['admin@aavahan.com']);
  if (existingAdmin.length === 0) {
    await pool.execute('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin@aavahan.com', hash2, 'admin']);
    console.log('Seeded admin user: admin@aavahan.com');
  }

  const [tables] = await pool.query('SHOW TABLES');
  console.log('Existing tables now:', tables);
  process.exit(0);
}

init().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
