import pool from '../src/db.js';

// Anyone who can manage the event may moderate its discussion
const canModerateEvent = async (eventId, user) => {
    if (user.role === 'admin') return true;

    const [event] = await pool.execute(
        'SELECT organizer_id FROM events WHERE id = ?',
        [eventId]
    );
    if (event.length && event[0].organizer_id === user.id) return true;

    const [manager] = await pool.execute(
        'SELECT id FROM event_managers WHERE event_id = ? AND user_id = ?',
        [eventId, user.id]
    );
    return manager.length > 0;
};

// GET /api/v1/events/:id/comments — list the discussion for an event
export const getComments = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT c.id, c.event_id, c.user_id, c.message, c.created_at,
                    u.name AS author_name, u.avatar_url AS author_avatar
             FROM event_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.event_id = ?
             ORDER BY c.created_at DESC`,
            [req.params.id]
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/v1/events/:id/comments — post a comment (any logged-in user)
export const postComment = async (req, res) => {
    try {
        const eventId = req.params.id;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
        }
        if (message.trim().length > 1000) {
            return res.status(400).json({ success: false, message: 'Comment is too long (1000 characters maximum)' });
        }

        const [event] = await pool.execute('SELECT id FROM events WHERE id = ?', [eventId]);
        if (!event.length) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const [result] = await pool.execute(
            'INSERT INTO event_comments (event_id, user_id, message) VALUES (?, ?, ?)',
            [eventId, req.user.id, message.trim()]
        );

        return res.status(201).json({
            success: true,
            message: 'Comment posted',
            data: {
                id: result.insertId,
                event_id: Number(eventId),
                user_id: req.user.id,
                message: message.trim(),
                author_name: req.user.name,
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/v1/events/:id/comments/:commentId — author, organiser, co-manager or admin
export const removeComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;

        const [rows] = await pool.execute(
            'SELECT user_id FROM event_comments WHERE id = ? AND event_id = ?',
            [commentId, id]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        const isAuthor = rows[0].user_id === req.user.id;
        if (!isAuthor && !(await canModerateEvent(id, req.user))) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
        }

        await pool.execute('DELETE FROM event_comments WHERE id = ?', [commentId]);
        return res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
