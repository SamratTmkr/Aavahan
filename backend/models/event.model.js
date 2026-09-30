import pool from '../src/db.js';

// Insert a new event
export async function createEvent({
    title,
    description = null,
    category = null,
    venue = null,
    address = null,
    city = null,
    country = 'Nepal',
    event_date = null,
    end_date = null,
    start_time = null,
    end_time = null,
    is_date_tba = false,
    registration_deadline = null,
    image_url = null,
    is_free = true,
    min_price = 0,
    currency = 'NPR',
    is_online = false,
    capacity = null,
    organizer_id = null,
    host_name = null,
    host_logo_url = null,
    contact_phone = null,
    require_phone = false
}) {
    const [result] = await pool.execute(
        `INSERT INTO events
         (title, description, category, venue, address, city, country, event_date, end_date, start_time, end_time, is_date_tba, registration_deadline, image_url, is_free, min_price, currency, is_online, capacity, organizer_id, host_name, host_logo_url, contact_phone, require_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            title,
            description ?? null,
            category ?? null,
            venue ?? null,
            address ?? null,
            city ?? null,
            country ?? 'Nepal',
            event_date ?? null,
            end_date ?? null,
            start_time ?? null,
            end_time ?? null,
            is_date_tba ? 1 : 0,
            registration_deadline ?? null,
            image_url ?? null,
            is_free ?? true,
            min_price ?? 0,
            currency ?? 'NPR',
            is_online ?? false,
            capacity ?? null,
            organizer_id ?? null,
            host_name ?? null,
            host_logo_url ?? null,
            contact_phone ?? null,
            require_phone ? 1 : 0
        ]
    );
    return result.insertId;
}

// Get all events, optionally filtered by city and/or full-text search
export async function getAllEvents(city = null, search = null) {
    const conditions = [];
    const params = [];

    if (city) {
        conditions.push('city LIKE ?');
        params.push(`%${city}%`);
    }

    if (search) {
        conditions.push('(title LIKE ? OR description LIKE ? OR venue LIKE ? OR category LIKE ? OR city LIKE ?)');
        const term = `%${search}%`;
        params.push(term, term, term, term, term);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
        `SELECT * FROM events ${where} ORDER BY event_date ASC`,
        params
    );
    return rows;
}

// Get a single event by ID (with organizer information)
export async function getEventById(id) {
    const [rows] = await pool.execute(
        `SELECT e.*, u.name AS organizer_name, u.email AS organizer_email
         FROM events e 
         LEFT JOIN users u ON e.organizer_id = u.id 
         WHERE e.id = ?`,
        [id]
    );
    return rows[0] || null;
}

// Update any fields on an event by ID, also bumps updated_at
export async function updateEvent(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    await pool.execute(`UPDATE events SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
}

// Delete an event by ID
export async function deleteEvent(id) {
    await pool.execute('DELETE FROM events WHERE id = ?', [id]);
}

