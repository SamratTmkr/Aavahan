export function getToken() {
    return localStorage.getItem('aavahan_token') || sessionStorage.getItem('aavahan_token') || null;
}

export function getUser() {
    const user = localStorage.getItem('aavahan_user') || sessionStorage.getItem('aavahan_user');
    if (!user) return null;
    try { return JSON.parse(user); } catch { return null; }
}

export function isAuthenticated() {
    return !!getToken();
}

export function setAuth(token, user) {
    if (token) {
        localStorage.setItem('aavahan_token', token);
        sessionStorage.setItem('aavahan_token', token);
    }
    if (user) {
        const data = JSON.stringify(user);
        localStorage.setItem('aavahan_user', data);
        sessionStorage.setItem('aavahan_user', data);
    }
    sessionStorage.setItem('aavahan_logged_in', 'true');
}

export function clearAuth() {
    localStorage.removeItem('aavahan_token');
    localStorage.removeItem('aavahan_user');
    sessionStorage.removeItem('aavahan_token');
    sessionStorage.removeItem('aavahan_user');
    sessionStorage.removeItem('aavahan_logged_in');
}
