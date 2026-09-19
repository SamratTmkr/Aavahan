import pool from '../src/db.js';

// Group schema descriptor — mirrors the 'groups' table
export const groupSchema = {
    tableName: 'groups',
    fields: {
        id:           { type: 'INT', primaryKey: true, autoIncrement: true },
        name:         { type: 'VARCHAR(200)', required: true },
        description:  { type: 'TEXT', required: false },
        category:     { type: 'VARCHAR(80)', required: false },
        city:         { type: 'VARCHAR(100)', required: true },
        avatar_url:   { type: 'TEXT', required: false },
        is_public:    { type: 'BOOLEAN', default: true },
        member_count: { type: 'INTEGER', default: 0 },
        organizer_id: { type: 'INT', required: false },
        created_at:   { type: 'TIMESTAMP', readOnly: true, default: 'CURRENT_TIMESTAMP' },
    },
};

// Insert a new group
export async function createGroup({ name, description = null, category = null, city, avatar_url = null, is_public = true, organizer_id = null }) {
    const [result] = await pool.execute(
        `INSERT INTO \`groups\` (name, description, category, city, avatar_url, is_public, organizer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, description ?? null, category ?? null, city, avatar_url ?? null, is_public ?? true, organizer_id ?? null]
    );
    return result.insertId;
}

// Get all groups, optionally filtered by city
export async function getAllGroups(city = null) {
    if (city) {
        const [rows] = await pool.execute(
            `SELECT g.*, COUNT(e.id) AS hosted_events_count 
             FROM \`groups\` g 
             LEFT JOIN events e ON g.id = e.group_id 
             WHERE g.city = ? 
             GROUP BY g.id 
             ORDER BY g.created_at DESC`,
            [city]
        );
        return rows;
    }
    const [rows] = await pool.execute(
        `SELECT g.*, COUNT(e.id) AS hosted_events_count 
         FROM \`groups\` g 
         LEFT JOIN events e ON g.id = e.group_id 
         GROUP BY g.id 
         ORDER BY g.created_at DESC`
    );
    return rows;
}

// Get a single group by ID
export async function getGroupById(id) {
    const [rows] = await pool.execute('SELECT * FROM `groups` WHERE id = ?', [id]);
    return rows[0] || null;
}

// Update any fields on a group by ID
export async function updateGroup(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    await pool.execute(`UPDATE \`groups\` SET ${setClause} WHERE id = ?`, [...values, id]);
}

// Delete a group by ID
export async function deleteGroup(id) {
    await pool.execute('DELETE FROM `groups` WHERE id = ?', [id]);
}

export default groupSchema;
