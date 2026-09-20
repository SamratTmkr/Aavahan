// authService.js — Centralized Authentication & Storage Service

// Retrieve stored JWT auth token
export function getToken() {
    return localStorage.getItem('aavahan_token') || sessionStorage.getItem('aavahan_token') || null;
}

// Retrieve stored user profile object safely
export function getUser() {
    try {
        const raw = localStorage.getItem('aavahan_user') || sessionStorage.getItem('aavahan_user');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.log('AuthService: Failed to parse user object from storage', e);
        return null;
    }
}

// Check if user has an active session token
export function isAuthenticated() {
    return !!getToken();
}

// Save authentication session credentials
export function setAuth(token, user) {
    if (token) {
        localStorage.setItem('aavahan_token', token);
        sessionStorage.setItem('aavahan_token', token);
    }
    if (user) {
        const serialized = typeof user === 'string' ? user : JSON.stringify(user);
        localStorage.setItem('aavahan_user', serialized);
        sessionStorage.setItem('aavahan_user', serialized);
    }
    sessionStorage.setItem('aavahan_logged_in', 'true');
}

// Clear all authentication session credentials
export function clearAuth() {
    localStorage.removeItem('aavahan_token');
    localStorage.removeItem('aavahan_user');
    sessionStorage.removeItem('aavahan_token');
    sessionStorage.removeItem('aavahan_user');
    sessionStorage.removeItem('aavahan_logged_in');
}

