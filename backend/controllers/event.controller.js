import { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent } from '../models/event.model.js';
import pool from '../src/db.js';
import fs from 'fs';
import { sendRegistrationConfirmation } from '../utils/email.js';
import { isEventPast, PAST_EVENT_MESSAGE } from '../utils/event-dates.js';
import { formatPhone, phoneError } from '../utils/phone.js';

// Helper to clean up the uploaded banner and logo when validation fails
const cleanupUploads = (req) => {
    [req.bannerFile, req.logoFile].forEach(file => {
        if (file && file.path) {
            fs.unlink(file.path, (err) => {
                if (err) console.log('Failed to cleanup uploaded file:', err.message);
            });
        }
    });
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
        end_date,
        start_time,
        end_time,
        is_date_tba,
        registration_deadline,
        is_free,
        min_price,
        currency,
        is_online,
        capacity,
        host_name,
        contact_phone_code,
        contact_phone_number,
        require_phone
    } = req.body;

    const isTba = is_date_tba === true || is_date_tba === 'true' || is_date_tba === 1 || is_date_tba === '1';

    // 1. Validate required title
    if (!title || !title.trim()) {
        cleanupUploads(req);
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
            cleanupUploads(req);
            return res.status(400).json({ success: false, message: 'Event date is required unless Date to be Announced is selected' });
        }
        if (!start_time) {
            cleanupUploads(req);
            return res.status(400).json({ success: false, message: 'Event start time is required unless Date to be Announced is selected' });
        }

        // Prevent past dates: event_date cannot be before today
        const todayStr = new Date().toISOString().split('T')[0];
        if (event_date < todayStr) {
            cleanupUploads(req);
            return res.status(400).json({ success: false, message: 'Event date cannot be in the past' });
        }

        finalEventDate = event_date;
        finalStartTime = start_time;

        // Validate registration deadline against combined event date + start time
        if (registration_deadline) {
            const eventDateTime = new Date(`${event_date}T${start_time}`);
            const deadlineDateTime = new Date(registration_deadline);

            if (isNaN(deadlineDateTime.getTime())) {
                cleanupUploads(req);
                return res.status(400).json({ success: false, message: 'Invalid registration deadline format' });
            }

            if (deadlineDateTime >= eventDateTime) {
                cleanupUploads(req);
                return res.status(400).json({ success: false, message: 'Registration deadline must be before the event date and start time' });
            }

            finalDeadline = registration_deadline;
        }
    }

    // Organiser contact number is optional, but must be valid when given
    let contactPhone = null;
    if (contact_phone_number && contact_phone_number.trim()) {
        contactPhone = formatPhone(contact_phone_code, contact_phone_number);
        if (!contactPhone) {
            cleanupUploads(req);
            return res.status(400).json({ success: false, message: phoneError(contact_phone_code, contact_phone_number) });
        }
    }

    // 3. Image URLs: strictly from the uploaded files (or null)
    const imageUrl = req.bannerFile ? `/uploads/events/${req.bannerFile.filename}` : null;
    const hostLogoUrl = req.logoFile ? `/uploads/events/${req.logoFile.filename}` : null;

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
            end_date: isTba ? null : (end_date || null),
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
            organizer_id: req.user.id,
            host_name: host_name && host_name.trim() ? host_name.trim() : null,
            host_logo_url: hostLogoUrl,
            contact_phone: contactPhone,
            require_phone: require_phone === true || require_phone === 'true'
        });

        return res.json({ success: true, message: 'Event created successfully', data: { id, image_url: imageUrl } });
    } catch (error) {
        cleanupUploads(req);
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PUT /api/v1/events/:id — updates an event (protected, must be organizer)
export const updateExistingEvent = async (req, res) => {
    try {
        const event = await getEventById(req.params.id);
        if (!event) {
            cleanupUploads(req);
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Organiser, co-managers and admins can edit
        const [manager] = await pool.execute(
            'SELECT id FROM event_managers WHERE event_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        const allowed = Number(event.organizer_id) === Number(req.user.id) || manager.length > 0 || req.user.role === 'admin';
        if (!allowed) {
            cleanupUploads(req);
            return res.status(403).json({ success: false, message: 'Not authorised' });
        }

        if (isEventPast(event)) {
            cleanupUploads(req);
            return res.status(403).json({ success: false, message: PAST_EVENT_MESSAGE });
        }

        // Only these columns can be changed from the edit form
        const editable = ['title', 'description', 'category', 'venue', 'city', 'event_date', 'end_date',
            'start_time', 'end_time', 'registration_deadline', 'capacity', 'is_online', 'host_name', 'require_phone'];
        const fields = {};
        editable.forEach(key => {
            if (req.body[key] !== undefined) fields[key] = req.body[key] === '' ? null : req.body[key];
        });

        if ('title' in fields && (!fields.title || !fields.title.trim())) {
            cleanupUploads(req);
            return res.status(400).json({ success: false, message: 'Event title is required' });
        }

        if ('is_online' in fields) fields.is_online = fields.is_online === true || fields.is_online === 'true';
        if ('require_phone' in fields) fields.require_phone = fields.require_phone === true || fields.require_phone === 'true';

        // Contact number: an empty value removes it, anything else must be valid
        if (req.body.contact_phone_number !== undefined) {
            const number = String(req.body.contact_phone_number).trim();
            if (!number) {
                fields.contact_phone = null;
            } else {
                fields.contact_phone = formatPhone(req.body.contact_phone_code, number);
                if (!fields.contact_phone) {
                    cleanupUploads(req);
                    return res.status(400).json({ success: false, message: phoneError(req.body.contact_phone_code, number) });
                }
            }
        }
        if ('capacity' in fields && fields.capacity !== null) {
            const capacity = parseInt(fields.capacity, 10);
            if (isNaN(capacity) || capacity < 1) {
                cleanupUploads(req);
                return res.status(400).json({ success: false, message: 'Capacity must be at least 1, or left empty for unlimited' });
            }

            const [[{ registered }]] = await pool.execute(
                "SELECT COUNT(*) AS registered FROM rsvps WHERE event_id = ? AND status <> 'cancelled'",
                [req.params.id]
            );
            if (capacity < registered) {
                cleanupUploads(req);
                return res.status(400).json({
                    success: false,
                    message: `${registered} people are already registered, so capacity cannot be lower than ${registered}`
                });
            }
            fields.capacity = capacity;
        }
        if (fields.event_date) fields.is_date_tba = false;
        if (req.bannerFile) fields.image_url = `/uploads/events/${req.bannerFile.filename}`;
        if (req.logoFile) fields.host_logo_url = `/uploads/events/${req.logoFile.filename}`;

        if (Object.keys(fields).length === 0) {
            return res.status(400).json({ success: false, message: 'Nothing to update' });
        }

        await updateEvent(req.params.id, fields);
        return res.json({ success: true, message: 'Event updated' });
    } catch (error) {
        cleanupUploads(req);
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/v1/events/:id — deletes an event (protected, must be organizer)
export const deleteExistingEvent = async (req, res) => {
    try {
        const event = await getEventById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        if (Number(event.organizer_id) !== Number(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorised' });
        }

        // Admins can still remove a past event, organisers cannot
        if (isEventPast(event) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: PAST_EVENT_MESSAGE });
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
            `SELECT capacity, attendee_count, registration_deadline, require_phone,
                    title, event_date, end_date, start_time, is_date_tba, is_online, venue, city
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

        if (isEventPast(events[0])) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'This event has already ended.' });
        }
        if (events[0].registration_deadline && new Date() > new Date(events[0].registration_deadline)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Registration deadline for this event has passed.' });
        }
        if (events[0].capacity && events[0].capacity > 0 && events[0].attendee_count >= events[0].capacity) {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'This event has reached full capacity.' });
        }

        // Some organisers ask every attendee for a phone number
        let phone = null;
        if (events[0].require_phone) {
            const body = req.body || {};
            phone = formatPhone(body.phone_code, body.phone_number);
            if (!phone) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'This event needs your phone number. ' + phoneError(body.phone_code, body.phone_number) + '.' });
            }
        }

        const [insertRes] = await connection.execute(
            'INSERT INTO rsvps (event_id, user_id, status, phone) VALUES (?, ?, ?, ?)',
            [eventId, userId, 'confirmed', phone]
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

        return res.json({ success: true, message: 'RSVP confirmed successfully!', rsvpId: insertRes.insertId });
    } catch (error) {
        await connection.rollback();
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};


// Organiser, co-manager or admin of the event
const canManageEvent = async (event, user) => {
    if (event.organizer_id === user.id || user.role === 'admin') return true;
    const [manager] = await pool.execute(
        'SELECT id FROM event_managers WHERE event_id = ? AND user_id = ?',
        [event.id, user.id]
    );
    return manager.length > 0;
};

// GET /api/v1/events/:id/attendees — attendee list with contact details, for the event's managers only
export const getAttendeeDetails = async (req, res) => {
    try {
        const [event] = await pool.execute('SELECT id, organizer_id FROM events WHERE id = ?', [req.params.id]);
        if (!event.length) return res.status(404).json({ success: false, message: 'Event not found' });

        if (!(await canManageEvent(event[0], req.user))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const [rows] = await pool.execute(
            `SELECT r.id, r.status, r.created_at, r.checked_in_at, r.phone, r.is_paid,
                    u.id AS user_id, u.name, u.email
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

// PATCH /api/v1/events/:id/rsvps/:rsvpId/payment — organiser marks an attendee as paid or unpaid.
// Allowed on past events too, since payments are often settled after the event.
export const setPaymentStatus = async (req, res) => {
    try {
        const { id, rsvpId } = req.params;
        const paid = req.body.paid === true || req.body.paid === 'true';

        const [event] = await pool.execute('SELECT id, organizer_id, is_free, min_price FROM events WHERE id = ?', [id]);
        if (!event.length) return res.status(404).json({ success: false, message: 'Event not found' });

        if (!(await canManageEvent(event[0], req.user))) {
            return res.status(403).json({ success: false, message: 'Not authorized to update payments' });
        }

        if (event[0].is_free || !Number(event[0].min_price)) {
            return res.status(400).json({ success: false, message: 'This event is free, there is nothing to pay' });
        }

        const [result] = await pool.execute(
            'UPDATE rsvps SET is_paid = ? WHERE id = ? AND event_id = ?',
            [paid ? 1 : 0, rsvpId, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Attendee not found' });
        }

        return res.json({ success: true, message: paid ? 'Marked as paid' : 'Marked as unpaid' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/v1/events/:id/rsvps/:rsvpId — remove an attendee (organiser, co-manager or admin)
export const removeAttendee = async (req, res) => {
    try {
        const { id, rsvpId } = req.params;

        const [event] = await pool.execute('SELECT id, organizer_id, event_date, end_date FROM events WHERE id = ?', [id]);
        if (!event.length) return res.status(404).json({ success: false, message: 'Event not found' });

        if (!(await canManageEvent(event[0], req.user))) {
            return res.status(403).json({ success: false, message: 'Not authorized to remove attendees' });
        }

        if (isEventPast(event[0])) {
            return res.status(403).json({ success: false, message: PAST_EVENT_MESSAGE });
        }

        const [result] = await pool.execute('DELETE FROM rsvps WHERE id = ? AND event_id = ?', [rsvpId, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Attendee not found' });
        }

        await pool.execute(
            'UPDATE events SET attendee_count = GREATEST(0, attendee_count - 1) WHERE id = ?',
            [id]
        );

        return res.json({ success: true, message: 'Attendee removed' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/v1/events/:id/rsvps — Get attendees for an event
export const getEventAttendees = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT r.id, r.status, r.created_at, u.id AS user_id, u.name
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
            `SELECT * FROM events
             WHERE organizer_id = ?
             ORDER BY event_date ASC`,
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

// PATCH /api/v1/events/:id/rsvps/:rsvpId/checkin — Check in an attendee (organizer or co-manager)
export const checkinAttendee = async (req, res) => {
    try {
        const { id, rsvpId } = req.params;

        const [event] = await pool.execute('SELECT organizer_id, event_date, end_date FROM events WHERE id = ?', [id]);
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

        if (isEventPast(event[0])) {
            return res.status(403).json({ success: false, message: PAST_EVENT_MESSAGE });
        }

        // Record when the attendee arrived, not just that they did
        await pool.execute(
            'UPDATE rsvps SET status = ?, checked_in_at = NOW() WHERE id = ? AND event_id = ?',
            ['checked_in', rsvpId, id]
        );
        return res.json({ success: true, message: 'Attendee marked as checked in' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/v1/events/user/my-activities — returns events registered by the logged-in user
export const getMyActivities = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            `SELECT r.id AS rsvp_id, r.status AS rsvp_status, r.created_at AS rsvp_created_at,
                    e.id AS event_id, e.title, e.description, e.category, e.venue, e.address, 
                    e.city, e.event_date, e.end_date, e.start_time, e.end_time, e.is_free, e.min_price,
                    e.currency, e.is_online, e.attendee_count
             FROM rsvps r
             JOIN events e ON r.event_id = e.id
             WHERE r.user_id = ?
             ORDER BY e.event_date ASC, e.start_time ASC`,
            [userId]
        );

        // Same rule as everywhere else: TBA events are never past, and
        // multi-day events stay upcoming until their last day is over
        const upcoming = [];
        const past = [];

        rows.forEach(item => {
            if (isEventPast(item)) {
                past.push(item);
            } else {
                upcoming.push(item);
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/v1/events/:id/managers — List co-managers for an event
export const listEventManagers = async (req, res) => {
    try {
        const eventId = req.params.id;

        const [event] = await pool.execute('SELECT id, organizer_id FROM events WHERE id = ?', [eventId]);
        if (!event.length) return res.status(404).json({ success: false, message: 'Event not found' });

        // The list includes email addresses, so only the event's team can see it
        if (!(await canManageEvent(event[0], req.user))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const [rows] = await pool.execute(
            `SELECT m.id, m.event_id, m.user_id, m.created_at,
                    u.name, u.email
             FROM event_managers m
             JOIN users u ON m.user_id = u.id
             WHERE m.event_id = ?
             ORDER BY m.created_at ASC`,
            [eventId]
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/v1/events/:id/managers — Add a co-manager by email or name (Organizer only)
export const addEventManager = async (req, res) => {
    try {
        const eventId = req.params.id;
        const lookup = (req.body.user || req.body.email || '').trim();

        if (!lookup) {
            return res.status(400).json({ success: false, message: 'Email or name is required' });
        }

        // Verify organizer permissions
        const [event] = await pool.execute(
            'SELECT organizer_id, event_date, end_date FROM events WHERE id = ?',
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

        if (isEventPast(event[0])) {
            return res.status(403).json({ success: false, message: PAST_EVENT_MESSAGE });
        }

        // Only existing users can be added: look them up by email, or by exact name
        const isEmail = lookup.includes('@');
        const [users] = isEmail
            ? await pool.execute('SELECT id, name, email FROM users WHERE email = ?', [lookup.toLowerCase()])
            : await pool.execute('SELECT id, name, email FROM users WHERE LOWER(name) = LOWER(?)', [lookup]);

        if (!users.length) {
            return res.status(404).json({
                success: false,
                message: isEmail ? 'No registered user found with this email' : 'No registered user found with this name'
            });
        }

        // Names are not unique, so ask for the email instead of guessing
        if (users.length > 1) {
            return res.status(409).json({ success: false, message: 'More than one user has this name. Please use their email instead.' });
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

        return res.status(201).json({
            success: true,
            message: `${targetUser.name} added as co-manager successfully`,
            data: { user_id: targetUser.id, name: targetUser.name, email: targetUser.email }
        });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/v1/events/:id/managers/:userId — Remove a co-manager (Organizer only)
export const removeEventManager = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.params.userId;

        const [event] = await pool.execute(
            'SELECT organizer_id, event_date, end_date FROM events WHERE id = ?',
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

        if (isEventPast(event[0])) {
            return res.status(403).json({ success: false, message: PAST_EVENT_MESSAGE });
        }

        await pool.execute(
            'DELETE FROM event_managers WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        return res.json({ success: true, message: 'Co-manager removed successfully' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
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
        const [event] = await pool.execute('SELECT organizer_id, event_date, end_date FROM events WHERE id = ?', [eventId]);
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

        if (isEventPast(event[0])) {
            return res.status(403).json({ success: false, message: PAST_EVENT_MESSAGE });
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

        return res.status(201).json({
            success: true,
            message: `${targetUser.name} registered as attendee successfully`
        });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

