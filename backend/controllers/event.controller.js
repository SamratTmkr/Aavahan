import { createEvent, getAllEvents, getEventById, getEventsByGroup, updateEvent, deleteEvent } from '../models/event.model.js';
import pool from '../src/db.js';

// GET /api/v1/events — returns all events, optional ?city= and ?search= filters
export const getEvents = async (req, res) => {
    try {
        const events = await getAllEvents(
            req.query.city   || null,
            req.query.search || null
        );
        return res.json({ success: true, data: events });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET /api/v1/events/:id — returns a single event
export const getEvent = async (req, res) => {
    try {
        const event = await getEventById(req.params.id);
        if (!event) return res.json({ success: false, message: 'Event not found' });
        return res.json({ success: true, data: event });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET /api/v1/events/group/:groupId — returns all events for a group
export const getGroupEvents = async (req, res) => {
    try {
        const events = await getEventsByGroup(req.params.groupId);
        return res.json({ success: true, data: events });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// POST /api/v1/events — creates a new event (protected)
export const createNewEvent = async (req, res) => {
    const { title, event_date } = req.body;

    if (!title || !event_date) {
        return res.json({ success: false, message: 'Title and event date are required' });
    }

    try {
        const id = await createEvent({ ...req.body, organizer_id: req.user.id });
        return res.json({ success: true, message: 'Event created', data: { id } });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// PUT /api/v1/events/:id — updates an event (protected, must be organizer)
export const updateExistingEvent = async (req, res) => {
    try {
        const event = await getEventById(req.params.id);
        if (!event) return res.json({ success: false, message: 'Event not found' });

        if (event.organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.json({ success: false, message: 'Not authorised' });
        }

        await updateEvent(req.params.id, req.body);
        return res.json({ success: true, message: 'Event updated' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// DELETE /api/v1/events/:id — deletes an event (protected, must be organizer)
export const deleteExistingEvent = async (req, res) => {
    try {
        const event = await getEventById(req.params.id);
        if (!event) return res.json({ success: false, message: 'Event not found' });

        if (event.organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.json({ success: false, message: 'Not authorised' });
        }

        await deleteEvent(req.params.id);
        return res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// POST /api/v1/events/:id/rsvp — RSVP to an event
export const rsvpEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const [existing] = await pool.execute(
            'SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );
        if (existing.length > 0) {
            return res.json({ success: true, message: 'You are already registered for this event!' });
        }

        await pool.execute(
            'INSERT INTO rsvps (event_id, user_id, status) VALUES (?, ?, ?)',
            [eventId, userId, 'confirmed']
        );

        await pool.execute(
            'UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ?',
            [eventId]
        );

        return res.json({ success: true, message: 'RSVP confirmed successfully!' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET /api/v1/events/:id/rsvps — Get attendees for an event
export const getEventAttendees = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT r.id, r.status, r.created_at, u.id AS user_id, u.name, u.avatar_url 
             FROM rsvps r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.event_id = ? 
             ORDER BY r.created_at DESC`,
            [req.params.id]
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET /api/v1/events/cities — Get aggregated event count by city
export const getEventCities = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT city, COUNT(*) AS count FROM events WHERE city IS NOT NULL AND TRIM(city) != "" GROUP BY city'
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET /api/v1/events/organizer/mine — returns events created by the logged-in user
export const getMyOrganizerEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            `SELECT e.*, g.name AS group_name 
             FROM events e 
             LEFT JOIN \`groups\` g ON e.group_id = g.id 
             WHERE e.organizer_id = ? 
             ORDER BY e.event_date ASC`,
            [userId]
        );

        // Compute metrics
        let totalRSVPs = 0;
        let grossVolume = 0;
        rows.forEach(ev => {
            const count = ev.attendee_count || 0;
            totalRSVPs += count;
            if (!ev.is_free && ev.min_price) {
                grossVolume += count * Number(ev.min_price);
            }
        });

        return res.json({
            success: true,
            data: rows,
            stats: {
                totalEvents: rows.length,
                totalRSVPs,
                grossVolume
            }
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET /api/v1/events/organizer/rsvps — returns recent RSVPs across all events organized by the user
export const getMyOrganizerRSVPs = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            `SELECT r.id, r.event_id, r.status, r.created_at, u.name AS user_name, u.email AS user_email, e.title AS event_title
             FROM rsvps r
             JOIN events e ON r.event_id = e.id
             JOIN users u ON r.user_id = u.id
             WHERE e.organizer_id = ?
             ORDER BY r.created_at DESC
             LIMIT 20`,
            [userId]
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
