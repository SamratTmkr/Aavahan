-- Aavahan MVP Schema
-- Run this once to bootstrap the database

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) DEFAULT 'user',  -- 'user' | 'admin'
  avatar_url    TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups (communities)
CREATE TABLE IF NOT EXISTS `groups` (
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
);

-- Events
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
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE SET NULL,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- RSVPs / Attendees
CREATE TABLE IF NOT EXISTS rsvps (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  event_id       INT NOT NULL,
  user_id        INT NOT NULL,
  status         VARCHAR(20) DEFAULT 'confirmed',  -- confirmed | checked_in | cancelled
  checked_in_at  TIMESTAMP NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
