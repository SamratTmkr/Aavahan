import { createEvent, getAllEvents, getEventById, getEventsByGroup, updateEvent, deleteEvent } from '../models/event.model.js';
import pool from '../src/db.js';
import fs from 'fs';

// Helper to clean up uploaded file when validation fails
const cleanupUploadedFile = (file) => {
    if (file && file.path) {
        fs.unlink(file.path, (err) => {
            if (err) console.warn('Failed to cleanup uploaded file:', err.message);
        });
    }
};

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
    const {
        title,
        description,
        category,
        venue,
        address,
        city,
        country,
        event_date,
        start_time,
        end_time,
        is_date_tba,
        registration_deadline,
        is_free,
        min_price,
        currency,
        is_online,
        capacity,
        group_id
    } = req.body;

    const isTba = is_date_tba === true || is_date_tba === 'true' || is_date_tba === 1 || is_date_tba === '1';

    // 1. Validate required title
    if (!title || !title.trim()) {
        cleanupUploadedFile(req.file);
        return res.status(400).json({ success: false, message: 'Event title is required' });
    }

    // 2. Validate dates & times
    let finalEventDate = null;
    let finalStartTime = null;
    let finalDeadline = null;

    if (isTba) {
        finalEventDate = null;
        finalStartTime = null;
    } else {
        if (!event_date) {
            cleanupUploadedFile(req.file);
            return res.status(400).json({ success: false, message: 'Event date is required unless Date to be Announced is selected' });
        }
        if (!start_time) {
            cleanupUploadedFile(req.file);
            return res.status(400).json({ success: false, message: 'Event start time is required unless Date to be Announced is selected' });
        }

        // Prevent past dates: event_date cannot be before today
        const todayStr = new Date().toISOString().split('T')[0];
        if (event_date < todayStr) {
            cleanupUploadedFile(req.file);
            return res.status(400).json({ success: false, message: 'Event date cannot be in the past' });
        }

        finalEventDate = event_date;
        finalStartTime = start_time;

        // Validate registration deadline against combined event date + start time
        if (registration_deadline) {
            const eventDateTime = new Date(`${event_date}T${start_time}`);
            const deadlineDateTime = new Date(registration_deadline);

            if (isNaN(deadlineDateTime.getTime())) {
                cleanupUploadedFile(req.file);
                return res.status(400).json({ success: false, message: 'Invalid registration deadline format' });
            }

            if (deadlineDateTime >= eventDateTime) {
                cleanupUploadedFile(req.file);
                return res.status(400).json({ success: false, message: 'Registration deadline must be before the event date and start time' });
            }

            finalDeadline = registration_deadline;
        }
    }

    // 3. Image URL: strictly from Multer req.file (or null)
    const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : null;

    try {
        const id = await createEvent({
            title: title.trim(),
            description: description || null,
            category: category || null,
            venue: venue || null,
            address: address || null,
            city: city || null,
            country: country || 'Nepal',
            event_date: finalEventDate,
            start_time: finalStartTime,
            end_time: end_time || null,
            is_date_tba: isTba,
            registration_deadline: finalDeadline,
            image_url: imageUrl,
            is_free: is_free === true || is_free === 'true' || min_price == 0,
            min_price: parseFloat(min_price) || 0,
            currency: currency || 'NPR',
            is_online: is_online === true || is_online === 'true' || is_online === 1 || is_online === '1',
            capacity: capacity ? parseInt(capacity, 10) : null,
            group_id: group_id ? parseInt(group_id, 10) : null,
            organizer_id: req.user.id
        });

        return res.json({ success: true, message: 'Event created successfully', data: { id, image_url: imageUrl } });
    } catch (error) {
        cleanupUploadedFile(req.file);
        return res.status(500).json({ success: false, message: error.message });
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

        const [events] = await pool.execute(
            'SELECT capacity, attendee_count, registration_deadline FROM events WHERE id = ?',
            [eventId]
        );
        if (!events.length) {
            return res.json({ success: false, message: 'Event not found' });
        }
        if (events[0].registration_deadline && new Date() > new Date(events[0].registration_deadline)) {
            return res.json({ success: false, message: 'Registration deadline for this event has passed.' });
        }
        if (events[0].capacity && events[0].capacity > 0 && events[0].attendee_count >= events[0].capacity) {
            return res.json({ success: false, message: 'This event has reached full capacity.' });
        }

        const [insertRes] = await pool.execute(
            'INSERT INTO rsvps (event_id, user_id, status) VALUES (?, ?, ?)',
            [eventId, userId, 'confirmed']
        );

        await pool.execute(
            'UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ?',
            [eventId]
        );

        return res.json({ success: true, message: 'RSVP confirmed successfully!', rsvpId: insertRes.insertId });
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

// PATCH /api/v1/events/:id/rsvps/:rsvpId/checkin — Check in an attendee (organizer only)
export const checkinAttendee = async (req, res) => {
    try {
        const { id, rsvpId } = req.params;
        const [events] = await pool.execute('SELECT organizer_id FROM events WHERE id = ?', [id]);
        if (!events.length) return res.json({ success: false, message: 'Event not found' });
        if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.json({ success: false, message: 'Not authorized' });
        }
        await pool.execute(
            'UPDATE rsvps SET status = ? WHERE id = ? AND event_id = ?',
            ['checked_in', rsvpId, id]
        );
        return res.json({ success: true, message: 'Attendee marked as checked in' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET /api/v1/events/user/my-activities — returns events registered by the logged-in user
export const getMyActivities = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            `SELECT r.id AS rsvp_id, r.status AS rsvp_status, r.created_at AS rsvp_created_at,
                    e.id AS event_id, e.title, e.description, e.category, e.venue, e.address, 
                    e.city, e.event_date, e.start_time, e.end_time, e.is_free, e.min_price, 
                    e.currency, e.is_online, e.attendee_count, g.name AS group_name
             FROM rsvps r
             JOIN events e ON r.event_id = e.id
             LEFT JOIN \`groups\` g ON e.group_id = g.id
             WHERE r.user_id = ?
             ORDER BY e.event_date ASC, e.start_time ASC`,
            [userId]
        );

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcoming = [];
        const past = [];

        rows.forEach(item => {
            const evDate = new Date(item.event_date);
            evDate.setHours(0, 0, 0, 0);
            if (evDate >= now) {
                upcoming.push(item);
            } else {
                past.push(item);
            }
        });

        past.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

        return res.json({
            success: true,
            data: { upcoming, past, total: rows.length }
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// DELETE /api/v1/events/:id/rsvp — cancel event RSVP
export const cancelRsvp = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const [existing] = await pool.execute(
            'SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        if (!existing.length) {
            return res.json({ success: false, message: 'No active registration found for this event.' });
        }

        await pool.execute(
            'DELETE FROM rsvps WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        await pool.execute(
            'UPDATE events SET attendee_count = GREATEST(0, attendee_count - 1) WHERE id = ?',
            [eventId]
        );

        return res.json({ success: true, message: 'Registration cancelled successfully.' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

