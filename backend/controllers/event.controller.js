import { createEvent, getAllEvents, getEventById, getEventsByGroup, updateEvent, deleteEvent } from '../models/event.model.js';
import pool from '../src/db.js';
import fs from 'fs';
import { sendRegistrationConfirmation } from '../utils/email.js';
import { makeCheckinCode } from '../utils/checkin-code.js';

// Helper to clean up uploaded file when validation fails
const cleanupUploadedFile = (file) => {
    if (file && file.path) {
        fs.unlink(file.path, (err) => {
            if (err) console.log('Failed to cleanup uploaded file:', err.message);
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/v1/events/:id — returns a single event
export const getEvent = async (req, res) => {
    try {
        const event = await getEventById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        return res.json({ success: true, data: event });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/v1/events/group/:groupId — returns all events for a group
export const getGroupEvents = async (req, res) => {
    try {
        const events = await getEventsByGroup(req.params.groupId);
        return res.json({ success: true, data: events });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PUT /api/v1/events/:id — updates an event (protected, must be organizer)
export const updateExistingEvent = async (req, res) => {
    try {
        const event = await getEventById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        if (event.organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorised' });
        }

        await updateEvent(req.params.id, req.body);
        return res.json({ success: true, message: 'Event updated' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/v1/events/:id — deletes an event (protected, must be organizer)
export const deleteExistingEvent = async (req, res) => {
    try {
        const event = await getEventById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        if (event.organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorised' });
        }

        await deleteEvent(req.params.id);
        return res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/v1/events/:id/rsvp — RSVP to an event
export const rsvpEvent = async (req, res) => {
    // One connection with a transaction, so the capacity check and the count update
    // cannot be split by another registration arriving at the same time
    const connection = await pool.getConnection();

    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        await connection.beginTransaction();

        // FOR UPDATE locks the event row until this transaction finishes
        const [events] = await connection.execute(
            `SELECT capacity, attendee_count, registration_deadline,
                    title, event_date, start_time, is_date_tba, is_online, venue, city
             FROM events WHERE id = ? FOR UPDATE`,
            [eventId]
        );
        if (!events.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const [existing] = await connection.execute(
            'SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );
        if (existing.length > 0) {
            await connection.rollback();
            return res.json({ success: true, message: 'You are already registered for this event!' });
        }

        if (events[0].registration_deadline && new Date() > new Date(events[0].registration_deadline)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Registration deadline for this event has passed.' });
        }
        if (events[0].capacity && events[0].capacity > 0 && events[0].attendee_count >= events[0].capacity) {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'This event has reached full capacity.' });
        }

        const checkinCode = makeCheckinCode();
        const [insertRes] = await connection.execute(
            'INSERT INTO rsvps (event_id, user_id, status, checkin_code) VALUES (?, ?, ?, ?)',
            [eventId, userId, 'confirmed', checkinCode]
        );

        await connection.execute(
            'UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ?',
            [eventId]
        );

        await connection.commit();

        // Fire and forget: a mail failure must not fail a confirmed registration
        sendRegistrationConfirmation({
            to: req.user.email,
            userName: req.user.name,
            event: events[0]
        }).catch(err => console.error('Confirmation email failed:', err.message));

        return res.json({ success: true, message: 'RSVP confirmed successfully!', rsvpId: insertRes.insertId, checkinCode });
    } catch (error) {
        await connection.rollback();
        console.log('Error creating RSVP:', error.message);
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};


// POST /api/v1/events/checkin — check someone in from their ticket code.
// The code identifies the registration, so the organiser does not need the ids.
export const checkinByCode = async (req, res) => {
    try {
        const code = (req.body.code || '').trim().toUpperCase();
        if (!code) {
            return res.status(400).json({ success: false, message: 'Check-in code is required' });
        }

        const [rows] = await pool.execute(
            `SELECT r.id, r.event_id, r.status, r.checked_in_at,
                    u.name AS attendee_name, e.title AS event_title, e.organizer_id
             FROM rsvps r
             JOIN users u ON r.user_id = u.id
             JOIN events e ON r.event_id = e.id
             WHERE r.checkin_code = ?`,
            [code]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'No registration found for that code' });
        }

        const rsvp = rows[0];

        // Only the organiser, a co-manager or an admin may check people in
        const [manager] = await pool.execute(
            'SELECT id FROM event_managers WHERE event_id = ? AND user_id = ?',
            [rsvp.event_id, req.user.id]
        );
        const allowed = rsvp.organizer_id === req.user.id || manager.length > 0 || req.user.role === 'admin';
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'You cannot check in attendees for this event' });
        }

        if (rsvp.status === 'checked_in') {
            return res.json({
                success: true,
                alreadyCheckedIn: true,
                message: `${rsvp.attendee_name} was already checked in`,
                data: { attendeeName: rsvp.attendee_name, eventTitle: rsvp.event_title, checkedInAt: rsvp.checked_in_at }
            });
        }

        await pool.execute(
            'UPDATE rsvps SET status = ?, checked_in_at = NOW() WHERE id = ?',
            ['checked_in', rsvp.id]
        );

        return res.json({
            success: true,
            alreadyCheckedIn: false,
            message: `${rsvp.attendee_name} checked in`,
            data: { attendeeName: rsvp.attendee_name, eventTitle: rsvp.event_title }
        });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
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
        rows.forEach(ev => {
            totalRSVPs += ev.attendee_count || 0;
        });

        return res.json({
            success: true,
            data: rows,
            stats: {
                totalEvents: rows.length,
                totalRSVPs
            }
        });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PATCH /api/v1/events/:id/rsvps/:rsvpId/checkin — Check in an attendee (organizer or co-manager)
export const checkinAttendee = async (req, res) => {
    try {
        const { id, rsvpId } = req.params;

        const [event] = await pool.execute('SELECT organizer_id FROM events WHERE id = ?', [id]);
        if (!event.length) return res.status(404).json({ success: false, message: 'Event not found' });

        const [manager] = await pool.execute(
            'SELECT id FROM event_managers WHERE event_id = ? AND user_id = ?',
            [id, req.user.id]
        );

        const isOrganizer = event[0].organizer_id === req.user.id;
        const isManager = manager.length > 0;
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isManager && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to check in attendees' });
        }

        // Record when the attendee arrived, not just that they did
        await pool.execute(
            'UPDATE rsvps SET status = ?, checked_in_at = NOW() WHERE id = ? AND event_id = ?',
            ['checked_in', rsvpId, id]
        );
        console.log(`Attendee ${rsvpId} checked in for event ${id}`);
        return res.json({ success: true, message: 'Attendee marked as checked in' });
    } catch (error) {
        console.log('Error checking in attendee:', error.message);
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/v1/events/user/my-activities — returns events registered by the logged-in user
export const getMyActivities = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            `SELECT r.id AS rsvp_id, r.status AS rsvp_status, r.created_at AS rsvp_created_at, r.checkin_code,
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
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
            return res.status(404).json({ success: false, message: 'No active registration found for this event.' });
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
        console.log('Error cancelling RSVP:', error.message);
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/v1/events/:id/managers — List co-managers for an event
export const listEventManagers = async (req, res) => {
    try {
        const eventId = req.params.id;

        const [rows] = await pool.execute(
            `SELECT m.id, m.event_id, m.user_id, m.created_at,
                    u.name, u.email, u.avatar_url
             FROM event_managers m
             JOIN users u ON m.user_id = u.id
             WHERE m.event_id = ?
             ORDER BY m.created_at ASC`,
            [eventId]
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.log('Error fetching event managers:', error.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/v1/events/:id/managers — Add a co-manager by email (Organizer only)
export const addEventManager = async (req, res) => {
    try {
        const eventId = req.params.id;
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Verify organizer permissions
        const [event] = await pool.execute(
            'SELECT organizer_id FROM events WHERE id = ?',
            [eventId]
        );

        if (!event.length) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const isOrganizer = event[0].organizer_id === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Only the event organizer can add co-managers' });
        }

        // Find user by email
        const [users] = await pool.execute(
            'SELECT id, name, email FROM users WHERE email = ?',
            [email]
        );

        if (!users.length) {
            return res.status(404).json({ success: false, message: 'No registered user found with this email' });
        }

        const targetUser = users[0];

        // Cannot add self if already the primary organizer
        if (targetUser.id === event[0].organizer_id) {
            return res.status(400).json({ success: false, message: 'This user is already the event organizer' });
        }

        // Check if already a co-manager
        const [existing] = await pool.execute(
            'SELECT id FROM event_managers WHERE event_id = ? AND user_id = ?',
            [eventId, targetUser.id]
        );

        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'This user is already a co-manager' });
        }

        await pool.execute(
            `INSERT INTO event_managers (event_id, user_id, added_by)
             VALUES (?, ?, ?)`,
            [eventId, targetUser.id, req.user.id]
        );

        console.log(`Co-manager ${email} added to event ${eventId}`);

        return res.status(201).json({
            success: true,
            message: `${targetUser.name} added as co-manager successfully`,
            data: { user_id: targetUser.id, name: targetUser.name, email: targetUser.email }
        });
    } catch (error) {
        console.log('Error adding co-manager:', error.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/v1/events/:id/managers/:userId — Remove a co-manager (Organizer only)
export const removeEventManager = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.params.userId;

        const [event] = await pool.execute(
            'SELECT organizer_id FROM events WHERE id = ?',
            [eventId]
        );

        if (!event.length) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const isOrganizer = event[0].organizer_id === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Only the event organizer can remove co-managers' });
        }

        await pool.execute(
            'DELETE FROM event_managers WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        console.log(`Co-manager ${userId} removed from event ${eventId}`);
        return res.json({ success: true, message: 'Co-manager removed successfully' });
    } catch (error) {
        console.log('Error removing co-manager:', error.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/v1/events/:id/manual-rsvp — Manually add registered user as attendee by email
export const addManualAttendee = async (req, res) => {
    try {
        const eventId = req.params.id;
        const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Check if event exists
        const [event] = await pool.execute('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
        if (!event.length) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Check permission (organizer, co-manager, admin)
        const [manager] = await pool.execute(
            'SELECT id FROM event_managers WHERE event_id = ? AND user_id = ?',
            [eventId, req.user.id]
        );

        const isOrganizer = event[0].organizer_id === req.user.id;
        const isManager = manager.length > 0;
        const isAdmin = req.user.role === 'admin';

        if (!isOrganizer && !isManager && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage attendees' });
        }

        // Find user by email
        const [users] = await pool.execute(
            'SELECT id, name, email FROM users WHERE email = ?',
            [email]
        );

        if (!users.length) {
            return res.status(404).json({
                success: false,
                message: 'No registered user found with this email'
            });
        }

        const targetUser = users[0];

        // Check if already registered
        const [existing] = await pool.execute(
            'SELECT id FROM rsvps WHERE event_id = ? AND user_id = ?',
            [eventId, targetUser.id]
        );

        if (existing.length) {
            return res.status(409).json({
                success: false,
                message: 'User is already registered'
            });
        }

        await pool.execute(
            `INSERT INTO rsvps (event_id, user_id, status)
             VALUES (?, ?, 'confirmed')`,
            [eventId, targetUser.id]
        );

        await pool.execute(
            'UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ?',
            [eventId]
        );

        console.log(`Manual attendee ${email} registered for event ${eventId}`);

        return res.status(201).json({
            success: true,
            message: `${targetUser.name} registered as attendee successfully`
        });
    } catch (error) {
        console.log('Error adding manual attendee:', error.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

