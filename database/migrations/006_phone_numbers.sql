-- Optional organiser contact number, and an option to make attendees give a phone number
ALTER TABLE events
    ADD COLUMN contact_phone VARCHAR(20) NULL AFTER host_logo_url,
    ADD COLUMN require_phone TINYINT(1) NOT NULL DEFAULT 0 AFTER contact_phone;

ALTER TABLE rsvps ADD COLUMN phone VARCHAR(20) NULL;
