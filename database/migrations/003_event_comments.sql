-- Migration 003: Event Comments
-- Backs the discussion box on the event page, which previously only added
-- comments to the page in the browser and lost them on reload.

CREATE TABLE IF NOT EXISTS event_comments (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    event_id   INT NOT NULL,
    user_id    INT NOT NULL,
    message    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
