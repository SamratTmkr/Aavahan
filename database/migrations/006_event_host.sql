-- Optional organiser name and logo shown as "Hosted by" on the event page
ALTER TABLE events
    ADD COLUMN host_name VARCHAR(150) NULL AFTER organizer_id,
    ADD COLUMN host_logo_url VARCHAR(500) NULL AFTER host_name;
