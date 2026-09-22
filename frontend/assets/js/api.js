import { getToken, clearAuth } from './authService.js';

// When Express serves the pages (npm start, or Docker on any port) the API is on the same
// origin. When the page is opened from the file system or from a separate static server
// such as VS Code Live Server, call the local backend directly.
const LIVE_SERVER_PORTS = ['5500', '5501'];
const API = (window.location.protocol === 'file:' || LIVE_SERVER_PORTS.includes(window.location.port))
    ? 'http://localhost:3000/api/v1'
    : '/api/v1';

// Returns headers including Bearer token if stored
function getHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

async function registerUser(name, email, password) {
    const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
    });
    return res.json();
}

async function loginUser(email, password) {
    const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
    });
    return res.json();
}

async function logoutUser() {
    try {
        await fetch(`${API}/auth/logout`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
        });
    } catch (e) {
        console.log('Logout API error:', e);
    }
    clearAuth();

    // Redirect to public homepage
    const isSubfolder = window.location.pathname.includes('/pages/');
    window.location.href = isSubfolder ? '../index.html' : 'index.html';
}


async function createEvent(data) {
    const isFormData = data instanceof FormData;
    const headers = getHeaders();
    if (isFormData) {
        delete headers['Content-Type'];
    }
    const res = await fetch(`${API}/events`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: isFormData ? data : JSON.stringify(data),
    });
    return res.json();
}

async function getEvents(city = null, search = null) {
    try {
        const params = new URLSearchParams();
        if (city && city !== 'all') params.set('city', city);
        if (search && search.trim()) params.set('search', search.trim());
        const qs = params.toString();
        const url = qs ? `${API}/events?${qs}` : `${API}/events`;
        const res = await fetch(url, { headers: getHeaders() });
        return await res.json();
    } catch (e) {
        console.log('API getEvents error:', e);
        return { success: false, data: [] };
    }
}

async function getEvent(id) {
    try {
        const res = await fetch(`${API}/events/${id}`, { headers: getHeaders() });
        return await res.json();
    } catch (e) {
        console.log('API getEvent error:', e);
        return { success: false, message: 'Event not found' };
    }
}

async function rsvpToEvent(eventId) {
    const res = await fetch(`${API}/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
    });
    return res.json();
}

async function cancelEventRsvp(eventId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/rsvp`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include',
        });
        return await res.json();
    } catch (e) {
        console.log('API cancelEventRsvp error:', e);
        return { success: false, message: 'Network error while cancelling registration' };
    }
}

async function getMyActivities() {
    try {
        const res = await fetch(`${API}/events/user/my-activities`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        return await res.json();
    } catch (e) {
        console.log('API getMyActivities error:', e);
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
        return await res.json();
    } catch (e) {
        console.log('API checkinEventAttendee error:', e);
        return { success: false, message: 'Check-in failed' };
    }
}


async function getEventCities() {
    try {
        const res = await fetch(`${API}/events/cities`, { headers: getHeaders() });
        return await res.json();
    } catch (e) {
        console.log('API getEventCities error:', e);
        return { success: false, data: [] };
    }
}

// Organizer hub helpers
async function getMyOrganizerEvents() {
    try {
        const res = await fetch(`${API}/events/organizer/mine`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        return await res.json();
    } catch (e) {
        console.log('API getMyOrganizerEvents error:', e);
        return { success: false, data: [], stats: { totalEvents: 0, totalRSVPs: 0, grossVolume: 0 } };
    }
}



async function updateEvent(id, eventData) {
    try {
        const res = await fetch(`${API}/events/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(eventData),
        });
        return await res.json();
    } catch (e) {
        console.log('API updateEvent error:', e);
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
        return await res.json();
    } catch (e) {
        console.log('API deleteEvent error:', e);
        return { success: false, message: e.message };
    }
}

// Admin helpers
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
        body: JSON.stringify({ role }),
    });
    return res.json();
}

async function adminDeleteUser(userId) {
    const res = await fetch(`${API}/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
    });
    return res.json();
}

async function adminDeleteEvent(eventId) {
    const res = await fetch(`${API}/events/${eventId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
    });
    return res.json();
}

async function getGroups(city = null) {
    const url = city ? `${API}/groups?city=${encodeURIComponent(city)}` : `${API}/groups`;
    const res = await fetch(url, { headers: getHeaders() });
    return res.json();
}

async function adminDeleteGroup(groupId) {
    const res = await fetch(`${API}/groups/${groupId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
    });
    return res.json();
}

async function getAdminTransactions() {
    try {
        const res = await fetch(`${API}/users/admin/transactions`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        return await res.json();
    } catch (e) {
        console.log('API getAdminTransactions error:', e);
        return { success: false, data: [] };
    }
}

// Announcements API
async function getEventAnnouncements(eventId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/announcements`, { headers: getHeaders() });
        return await res.json();
    } catch (e) {
        console.log('API getEventAnnouncements error:', e);
        return { success: false, data: [] };
    }
}

async function createEventAnnouncement(eventId, announcementData) {
    try {
        const res = await fetch(`${API}/events/${eventId}/announcements`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(announcementData)
        });
        return await res.json();
    } catch (e) {
        console.log('API createEventAnnouncement error:', e);
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
        return await res.json();
    } catch (e) {
        console.log('API deleteEventAnnouncement error:', e);
        return { success: false, message: 'Network error' };
    }
}

// Co-managers API
async function getEventManagers(eventId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/managers`, { headers: getHeaders(), credentials: 'include' });
        return await res.json();
    } catch (e) {
        console.log('API getEventManagers error:', e);
        return { success: false, data: [] };
    }
}

async function addEventManager(eventId, email) {
    try {
        const res = await fetch(`${API}/events/${eventId}/managers`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ email })
        });
        return await res.json();
    } catch (e) {
        console.log('API addEventManager error:', e);
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
        return await res.json();
    } catch (e) {
        console.log('API removeEventManager error:', e);
        return { success: false, message: 'Network error' };
    }
}

// Manual attendee RSVP by email
async function addManualAttendee(eventId, email) {
    try {
        const res = await fetch(`${API}/events/${eventId}/manual-rsvp`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ email })
        });
        return await res.json();
    } catch (e) {
        console.log('API addManualAttendee error:', e);
        return { success: false, message: 'Network error' };
    }
}

// Comments API
async function getEventComments(eventId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/comments`, { headers: getHeaders() });
        return await res.json();
    } catch (e) {
        console.log('API getEventComments error:', e);
        return { success: false, data: [] };
    }
}

async function postEventComment(eventId, message) {
    try {
        const res = await fetch(`${API}/events/${eventId}/comments`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ message })
        });
        return await res.json();
    } catch (e) {
        console.log('API postEventComment error:', e);
        return { success: false, message: 'Network error' };
    }
}

async function deleteEventComment(eventId, commentId) {
    try {
        const res = await fetch(`${API}/events/${eventId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });
        return await res.json();
    } catch (e) {
        console.log('API deleteEventComment error:', e);
        return { success: false, message: 'Network error' };
    }
}

// Password reset
async function requestPasswordReset(email) {
    try {
        const res = await fetch(`${API}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return await res.json();
    } catch (e) {
        console.log('API requestPasswordReset error:', e);
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
        return await res.json();
    } catch (e) {
        console.log('API resetPassword error:', e);
        return { success: false, message: 'Network error' };
    }
}

// Check in from a ticket code (scanned QR or typed by hand)
async function checkinByCode(code) {
    try {
        const res = await fetch(`${API}/events/checkin`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ code })
        });
        return await res.json();
    } catch (e) {
        console.log('API checkinByCode error:', e);
        return { success: false, message: 'Network error' };
    }
}

export {
    requestPasswordReset,
    resetPassword,
    checkinByCode,
    getEventComments,
    postEventComment,
    deleteEventComment,
    registerUser,
    loginUser,
    logoutUser,
    getEvents,
    getEvent,
    createEvent,
    rsvpToEvent,
    cancelEventRsvp,
    getMyActivities,
    getEventAttendees,
    checkinEventAttendee,
    getEventCities,
    deleteEvent,
    updateEvent,
    getMyOrganizerEvents,
    getAdminUsers,
    updateUserRole,
    adminDeleteUser,
    adminDeleteEvent,
    getGroups,
    adminDeleteGroup,
    getAdminTransactions,
    getEventAnnouncements,
    createEventAnnouncement,
    deleteEventAnnouncement,
    getEventManagers,
    addEventManager,
    removeEventManager,
    addManualAttendee
};

