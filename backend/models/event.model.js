import pool from '../src/db.js';

// Event schema descriptor — mirrors the 'events' table
export const eventSchema = {
    tableName: 'events',
    fields: {
        id:             { type: 'INT', primaryKey: true, autoIncrement: true },
        title:          { type: 'VARCHAR(300)', required: true },
        description:    { type: 'TEXT', required: false },
        category:       { type: 'VARCHAR(80)', required: false },
        venue:          { type: 'VARCHAR(200)', required: false },
        address:        { type: 'TEXT', required: false },
        city:           { type: 'VARCHAR(100)', required: false },
        country:        { type: 'VARCHAR(80)', default: 'Nepal' },
        event_date:     { type: 'DATE', required: false },
        start_time:     { type: 'TIME', required: false },
        end_time:       { type: 'TIME', required: false },
        is_date_tba:    { type: 'BOOLEAN', default: false },
        registration_deadline: { type: 'DATETIME', required: false },
        image_url:      { type: 'VARCHAR(500)', required: false },
        is_free:        { type: 'BOOLEAN', default: true },
        min_price:      { type: 'DECIMAL(10,2)', default: 0 },
        currency:       { type: 'VARCHAR(10)', default: 'NPR' },
        is_online:      { type: 'BOOLEAN', default: false },
        capacity:       { type: 'INTEGER', required: false },
        attendee_count: { type: 'INTEGER', default: 0 },
        group_id:       { type: 'INT', required: false },
        organizer_id:   { type: 'INT', required: false },
        created_at:     { type: 'TIMESTAMP', readOnly: true, default: 'CURRENT_TIMESTAMP' },
        updated_at:     { type: 'TIMESTAMP', readOnly: true, default: 'CURRENT_TIMESTAMP' },
    },
};

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
    group_id = null,
    organizer_id = null
}) {
    const [result] = await pool.execute(
        `INSERT INTO events
         (title, description, category, venue, address, city, country, event_date, start_time, end_time, is_date_tba, registration_deadline, image_url, is_free, min_price, currency, is_online, capacity, group_id, organizer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            title,
            description ?? null,
            category ?? null,
            venue ?? null,
            address ?? null,
            city ?? null,
            country ?? 'Nepal',
            event_date ?? null,
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
            group_id ?? null,
            organizer_id ?? null
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

// Get a single event by ID (with organizer & group information)
export async function getEventById(id) {
    const [rows] = await pool.execute(
        `SELECT e.*, u.name AS organizer_name, u.email AS organizer_email, g.name AS group_name 
         FROM events e 
         LEFT JOIN users u ON e.organizer_id = u.id 
         LEFT JOIN \`groups\` g ON e.group_id = g.id 
         WHERE e.id = ?`,
        [id]
    );
    return rows[0] || null;
}

// Get all events belonging to a specific group
export async function getEventsByGroup(group_id) {
    const [rows] = await pool.execute('SELECT * FROM events WHERE group_id = ? ORDER BY event_date ASC', [group_id]);
    return rows;
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

export default eventSchema;
