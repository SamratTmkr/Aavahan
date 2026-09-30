-- Organisers confirm by hand whether each attendee of a paid event has paid
ALTER TABLE rsvps ADD COLUMN is_paid TINYINT(1) NOT NULL DEFAULT 0;
