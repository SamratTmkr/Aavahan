import { getToken, clearAuth } from './authService.js';

const API = '/api/v1';

function getHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

async function registerUser(name, email, password) {
    const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
    });
    return res.json();
}

async function loginUser(email, password) {
    const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
    });
    return res.json();
}

async function logoutUser() {
    try {
        await fetch(`${API}/auth/logout`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include'
        });
    } catch (e) {
        console.log('Logout error:', e);
    }
    clearAuth();
    const sub = window.location.pathname.includes('/pages/');
    window.location.href = sub ? '../index.html' : 'index.html';
}

async function createEvent(data) {
    const isFormData = data instanceof FormData;
    const headers = getHeaders();
    if (isFormData) delete headers['Content-Type'];
    const res = await fetch(`${API}/events`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: isFormData ? data : JSON.stringify(data)
    });
    return res.json();
}

async function getEvents(city = null, search = null) {
    try {
        const params = new URLSearchParams();
        if (city && city !== 'all') params.set('city', city);
        if (search && search.trim()) params.set('search', search.trim());
        const qs = params.toString();
        const res = await fetch(`${API}/events${qs ? '?' + qs : ''}`, { headers: getHeaders() });
        return res.json();
    } catch (e) {
        console.log('getEvents error:', e);
        return { success: false, data: [] };
    }
}

async function getEvent(id) {
    try {
        const res = await fetch(`${API}/events/${id}`, { headers: getHeaders() });
        return res.json();
    } catch (e) {
        console.log('getEvent error:', e);
        return { success: false, message: 'Event not found' };
    }
}

async function rsvpToEvent(eventId, details = {}) {
    const res = await fetch(`${API}/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(details)
    });
    return res.json();
}

async function getAttendeeDetails(eventId) {
    const res = await fetch(`${API}/events/${eventId}/attendees`, { headers: getHeaders() });
    return res.json();
}

async function setAttendeePayment(eventId, rsvpId, paid) {
    try {
        const res = await fetch(`${API}/events/${eventId}/rsvps/${rsvpId}/payment`, {
            method: 'PATCH',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ paid })
        });
        return res.json();
    } catch (e) {
        console.log('setAttendeePayment error:', e);
        return { success: false, message: 'Network error' };
    }
}

async function removeEventAttendee(eventId, rsvpId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/rsvps/${rsvpId}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });
        return res.json();
    } catch (e) {
        console.log('removeEventAttendee error:', e);
        return { success: false, message: 'Network error' };
    }
}

async function cancelEventRsvp(eventId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/rsvp`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });
        return res.json();
    } catch (e) {
        console.log('cancelEventRsvp error:', e);
        return { success: false, message: 'Network error while cancelling registration' };
    }
}

async function getMyActivities() {
    try {
        const res = await fetch(`${API}/events/user/my-activities`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        return res.json();
    } catch (e) {
        console.log('getMyActivities error:', e);
        return { success: false, data: { upcoming: [], past: [], total: 0 } };
    }
}

async function getEventAttendees(eventId) {
    const res = await fetch(`${API}/events/${eventId}/rsvps`, { headers: getHeaders() });
    return res.json();
}

async function checkinEventAttendee(eventId, rsvpId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/rsvps/${rsvpId}/checkin`, {
            method: 'PATCH',
            headers: getHeaders(),
            credentials: 'include'
        });
        return res.json();
    } catch (e) {
        console.log('checkinEventAttendee error:', e);
        return { success: false, message: 'Check-in failed' };
    }
}

async function getEventCities() {
    try {
        const res = await fetch(`${API}/events/cities`, { headers: getHeaders() });
        return res.json();
    } catch (e) {
        console.log('getEventCities error:', e);
        return { success: false, data: [] };
    }
}

async function getMyOrganizerEvents() {
    try {
        const res = await fetch(`${API}/events/organizer/mine`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        return res.json();
    } catch (e) {
        console.log('getMyOrganizerEvents error:', e);
        return { success: false, data: [], stats: { totalEvents: 0, totalRSVPs: 0 } };
    }
}

async function updateEvent(id, eventData) {
    try {
        const isFormData = eventData instanceof FormData;
        const headers = getHeaders();
        if (isFormData) delete headers['Content-Type'];
        const res = await fetch(`${API}/events/${id}`, {
            method: 'PUT',
            headers,
            credentials: 'include',
            body: isFormData ? eventData : JSON.stringify(eventData)
        });
        return res.json();
    } catch (e) {
        console.log('updateEvent error:', e);
        return { success: false, message: e.message };
    }
}

async function deleteEvent(eventId) {
    try {
        const res = await fetch(`${API}/events/${eventId}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });
        return res.json();
    } catch (e) {
        console.log('deleteEvent error:', e);
        return { success: false, message: e.message };
    }
}

//admin
async function getAdminUsers(search = null) {
    const url = search ? `${API}/users?search=${encodeURIComponent(search)}` : `${API}/users`;
    const res = await fetch(url, { headers: getHeaders(), credentials: 'include' });
    return res.json();
}

async function updateUserRole(userId, role) {
    const res = await fetch(`${API}/users/${userId}/role`, {
        method: 'PATCH',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ role })
    });
    return res.json();
}

async function adminDeleteUser(userId) {
    const res = await fetch(`${API}/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include'
    });
    return res.json();
}

async function adminDeleteEvent(eventId) {
    const res = await fetch(`${API}/events/${eventId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include'
    });
    return res.json();
}

//announcements
async function getEventAnnouncements(eventId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/announcements`, { headers: getHeaders() });
        return res.json();
    } catch (e) {
        console.log('getEventAnnouncements error:', e);
        return { success: false, data: [] };
    }
}

async function createEventAnnouncement(eventId, data) {
    try {
        const res = await fetch(`${API}/events/${eventId}/announcements`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(data)
        });
        return res.json();
    } catch (e) {
        console.log('createEventAnnouncement error:', e);
        return { success: false, message: 'Network error' };
    }
}

async function deleteEventAnnouncement(eventId, announcementId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/announcements/${announcementId}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });
        return res.json();
    } catch (e) {
        console.log('deleteEventAnnouncement error:', e);
        return { success: false, message: 'Network error' };
    }
}

//co-managers
async function getEventManagers(eventId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/managers`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        return res.json();
    } catch (e) {
        console.log('getEventManagers error:', e);
        return { success: false, data: [] };
    }
}

async function addEventManager(eventId, user) {
    try {
        const res = await fetch(`${API}/events/${eventId}/managers`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ user })
        });
        return res.json();
    } catch (e) {
        console.log('addEventManager error:', e);
        return { success: false, message: 'Network error' };
    }
}

async function removeEventManager(eventId, userId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/managers/${userId}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });
        return res.json();
    } catch (e) {
        console.log('removeEventManager error:', e);
        return { success: false, message: 'Network error' };
    }
}

async function addManualAttendee(eventId, email) {
    try {
        const res = await fetch(`${API}/events/${eventId}/manual-rsvp`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ email })
        });
        return res.json();
    } catch (e) {
        console.log('addManualAttendee error:', e);
        return { success: false, message: 'Network error' };
    }
}

//password reset
async function requestPasswordReset(email) {
    try {
        const res = await fetch(`${API}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return res.json();
    } catch (e) {
        console.log('requestPasswordReset error:', e);
        return { success: false, message: 'Network error' };
    }
}

async function resetPassword(token, password) {
    try {
        const res = await fetch(`${API}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
        });
        return res.json();
    } catch (e) {
        console.log('resetPassword error:', e);
        return { success: false, message: 'Network error' };
    }
}

export {
    getAttendeeDetails, removeEventAttendee, setAttendeePayment,
    requestPasswordReset, resetPassword,
    registerUser, loginUser, logoutUser,
    getEvents, getEvent, createEvent,
    rsvpToEvent, cancelEventRsvp,
    getMyActivities, getEventAttendees, checkinEventAttendee,
    getEventCities, deleteEvent, updateEvent, getMyOrganizerEvents,
    getAdminUsers, updateUserRole, adminDeleteUser, adminDeleteEvent,
    getEventAnnouncements, createEventAnnouncement, deleteEventAnnouncement,
    getEventManagers, addEventManager, removeEventManager, addManualAttendee
};
