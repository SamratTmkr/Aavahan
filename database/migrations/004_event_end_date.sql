-- Add end_date to events table for multi-day event support
ALTER TABLE events ADD COLUMN end_date DATE NULL AFTER event_date;
