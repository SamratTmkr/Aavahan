-- Migration 004: check-in codes and password reset
--
-- checkin_code gives every registration a short unguessable code. It is what the
-- QR on a attendee's ticket encodes, and what an organiser can type in by hand if
-- the camera will not cooperate.
--
-- password_resets backs the "Forgot password?" link, which until now only showed
-- a message claiming an email had been sent.

ALTER TABLE rsvps ADD COLUMN checkin_code CHAR(8) NULL;
CREATE UNIQUE INDEX idx_rsvps_checkin_code ON rsvps (checkin_code);

CREATE TABLE IF NOT EXISTS password_resets (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at    TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_password_resets_token (token_hash)
);
