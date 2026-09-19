import { getToken, clearAuth } from './authService.js';

const API = 'http://localhost:3001/api/v1';

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
        console.warn('Logout API error:', e);
    }
    clearAuth();
    
    // Redirect to public homepage
    const isSubfolder = window.location.pathname.includes('/pages/');
    window.location.href = isSubfolder ? '../index.html' : 'index.html';
}

async function createGroup(data) {
    const res = await fetch(`${API}/groups`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
    });
    return res.json();
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
        if (city && city !== 'all')   params.set('city', city);
        if (search && search.trim())  params.set('search', search.trim());
        const qs  = params.toString();
        const url = qs ? `${API}/events?${qs}` : `${API}/events`;
        const res = await fetch(url, { headers: getHeaders() });
        return await res.json();
    } catch (e) {
        console.warn('API getEvents error:', e);
        return { success: false, data: [] };
    }
}

async function getEvent(id) {
    try {
        const res = await fetch(`${API}/events/${id}`, { headers: getHeaders() });
        return await res.json();
    } catch (e) {
        console.warn('API getEvent error:', e);
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
        console.warn('API cancelEventRsvp error:', e);
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
        console.warn('API getMyActivities error:', e);
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
        console.warn('API checkinEventAttendee error:', e);
        return { success: false, message: 'Check-in failed' };
    }
}

async function searchEvents(query, city = null) {
    return getEvents(city, query);
}

async function getEventCities() {
    try {
        const res = await fetch(`${API}/events/cities`, { headers: getHeaders() });
        return await res.json();
    } catch (e) {
        console.warn('API getEventCities error:', e);
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
        console.warn('API getMyOrganizerEvents error:', e);
        return { success: false, data: [], stats: { totalEvents: 0, totalRSVPs: 0, grossVolume: 0 } };
    }
}

async function getMyOrganizerRSVPs() {
    try {
        const res = await fetch(`${API}/events/organizer/rsvps`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        return await res.json();
    } catch (e) {
        console.warn('API getMyOrganizerRSVPs error:', e);
        return { success: false, data: [] };
    }
}

async function getMyOrganizerGroups() {
    try {
        const res = await fetch(`${API}/groups/organizer/mine`, {
            headers: getHeaders(),
            credentials: 'include'
        });
        return await res.json();
    } catch (e) {
        console.warn('API getMyOrganizerGroups error:', e);
        return { success: false, data: [] };
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
        console.warn('API updateEvent error:', e);
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
        console.warn('API deleteEvent error:', e);
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
        console.warn('API getAdminTransactions error:', e);
        return { success: false, data: [] };
    }
}


export {
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
    searchEvents,
    getEventCities,
    deleteEvent,
    updateEvent,
    getMyOrganizerEvents,
    getMyOrganizerRSVPs,
    getAdminUsers,
    updateUserRole,
    adminDeleteUser,
    adminDeleteEvent,
    getGroups,
    adminDeleteGroup,
    getAdminTransactions
};

