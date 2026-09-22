import pool from '../src/db.js';
import { sendAnnouncementEmail, wait } from '../utils/email.js';


// Emails every registered attendee about a new announcement
const notifyAttendees = async (eventId, title, message) => {
    const [rows] = await pool.execute(
        `SELECT u.name, u.email, e.title AS event_title
         FROM rsvps r
         JOIN users u ON r.user_id = u.id
         JOIN events e ON r.event_id = e.id
         WHERE r.event_id = ? AND r.status <> 'cancelled'`,
        [eventId]
    );

    for (const [index, row] of rows.entries()) {
        // Paced so the provider's per-second limit is not tripped
        if (index > 0) await wait(2000);

        await sendAnnouncementEmail({
            to: row.email,
            userName: row.name,
            eventTitle: row.event_title,
            title,
            message
        });
    }

    console.log(`Announcement emailed to ${rows.length} attendee(s) of event ${eventId}`);
};

// GET /api/v1/events/:id/announcements — List announcements for an event
export const getAnnouncements = async (req, res) => {
    try {
        const eventId = req.params.id;
        const [rows] = await pool.execute(
            `SELECT a.id, a.event_id, a.author_id, a.title, a.message, a.created_at,
                    u.name AS author_name, u.avatar_url AS author_avatar
             FROM event_announcements a
             JOIN users u ON a.author_id = u.id
             WHERE a.event_id = ?
             ORDER BY a.created_at DESC`,
            [eventId]
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.log('Error fetching announcements:', error.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/v1/events/:id/announcements — Post official one-way announcement
export const postAnnouncement = async (req, res) => {
    try {
        const eventId = req.params.id;
        const { title, message } = req.body;

        if (!title || !title.trim() || !message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }

        // Check if event exists and get organizer
        const [event] = await pool.execute(
            'SELECT organizer_id FROM events WHERE id = ?',
            [eventId]
        );

        if (!event.length) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Check if user is co-manager
        const [manager] = await pool.execute(
            'SELECT id FROM event_managers WHERE event_id = ? AND user_id = ?',
            [eventId, req.user.id]
        );

        const isOrganizer = event[0].organizer_id === req.user.id;
        const isManager = manager.length > 0;
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isManager && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO event_announcements
             (event_id, author_id, title, message)
             VALUES (?, ?, ?, ?)`,
            [eventId, req.user.id, title.trim(), message.trim()]
        );

        console.log('Announcement posted successfully for event:', eventId);

        // Email everyone registered. Sent one by one so no attendee sees another's
        // address, and detached so a mail failure cannot fail the announcement.
        notifyAttendees(eventId, title.trim(), message.trim())
            .catch(err => console.error('Announcement emails failed:', err.message));

        return res.status(201).json({
            success: true,
            message: 'Announcement broadcasted successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.log('Error posting announcement:', error.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/v1/events/:id/announcements/:announcementId — Delete an announcement
export const removeAnnouncement = async (req, res) => {
    try {
        const { id, announcementId } = req.params;

        const [event] = await pool.execute(
            'SELECT organizer_id FROM events WHERE id = ?',
            [id]
        );

        const [manager] = await pool.execute(
            'SELECT id FROM event_managers WHERE event_id = ? AND user_id = ?',
            [id, req.user.id]
        );

        const isOrganizer = event.length && event[0].organizer_id === req.user.id;
        const isManager = manager.length > 0;
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isManager && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        await pool.execute(
            'DELETE FROM event_announcements WHERE id = ? AND event_id = ?',
            [announcementId, id]
        );

        console.log('Announcement deleted:', announcementId);
        return res.json({ success: true, message: 'Announcement deleted' });
    } catch (error) {
        console.log('Error deleting announcement:', error.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
