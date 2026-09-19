import { getToken, getUser, isAuthenticated, clearAuth } from './authService.js';

// main.js

// Toast notification
export function showToast(message, type = 'info') {
    if (!message || /loading|cancelling|removing|processing|redirecting/i.test(message)) {
        return;
    }

    let container = document.getElementById('aavGlobalToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'aavGlobalToastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    else if (type === 'error') icon = 'error';
    else if (type === 'warning') icon = 'warning';

    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
        <button type="button" aria-label="Dismiss" class="toast-close-btn">
            <span class="material-symbols-outlined toast-close-icon">close</span>
        </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });

    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

if (typeof window !== 'undefined') {
    window.showToast = showToast;
}

// Navbar auth state
function updateNavbar() {
    const isLoggedIn = isAuthenticated();
    const user = getUser() || {};

    const navLogin  = document.getElementById('navLogin');
    const navSignup = document.getElementById('navSignup');
    const navLogout = document.getElementById('navLogout');


    if (!navLogin || !navSignup || !navLogout) return;

    const isSubfolder = window.location.pathname.includes('/pages/');

    if (isLoggedIn) {
        navLogin.classList.add('is-hidden');
        navSignup.classList.add('is-hidden');
        navLogout.classList.remove('is-hidden');

        // My Activities link
        let navMyActivities = document.getElementById('navMyActivities');
        if (!navMyActivities) {
            navMyActivities = document.createElement('a');
            navMyActivities.id = 'navMyActivities';
            navMyActivities.className = 'nav-link-group';
            navMyActivities.textContent = 'My Activities';
            navMyActivities.href = isSubfolder ? 'my-activities.html' : 'pages/my-activities.html';
            navLogout.parentNode.insertBefore(navMyActivities, navLogout);
        } else {
            navMyActivities.classList.remove('is-hidden');
        }

        // Mobile drawer My Activities link
        let mobileMyActivities = document.getElementById('mobileMyActivities');
        const mobileLinks = document.querySelector('.mobile-nav-links');
        if (mobileLinks) {
            if (!mobileMyActivities) {
                mobileMyActivities = document.createElement('a');
                mobileMyActivities.id = 'mobileMyActivities';
                mobileMyActivities.className = 'mobile-nav-link';
                mobileMyActivities.textContent = 'My Activities';
                mobileMyActivities.href = isSubfolder ? 'my-activities.html' : 'pages/my-activities.html';
                mobileLinks.appendChild(mobileMyActivities);
            } else {
                mobileMyActivities.classList.remove('is-hidden');
            }
        }

        // Admin badge link
        let navAdmin = document.getElementById('navAdmin');
        if (user.role === 'admin') {
            if (!navAdmin) {
                navAdmin = document.createElement('a');
                navAdmin.id = 'navAdmin';
                navAdmin.className = 'nav-link-group nav-admin-link';
                navAdmin.innerHTML = '<span class="material-symbols-outlined nav-admin-icon">admin_panel_settings</span> Admin';
                navAdmin.href = isSubfolder ? 'admin.html' : 'pages/admin.html';
                navLogout.parentNode.insertBefore(navAdmin, navLogout);
            } else {
                navAdmin.classList.remove('is-hidden');
            }
        } else if (navAdmin) {
            navAdmin.classList.add('is-hidden');
        }
    } else {
        navLogin.classList.remove('is-hidden');
        navSignup.classList.remove('is-hidden');
        navLogout.classList.add('is-hidden');

        const navMyActivities = document.getElementById('navMyActivities');
        if (navMyActivities) navMyActivities.classList.add('is-hidden');

        const mobileMyActivities = document.getElementById('mobileMyActivities');
        if (mobileMyActivities) mobileMyActivities.classList.add('is-hidden');

        const navAdmin = document.getElementById('navAdmin');
        if (navAdmin) navAdmin.classList.add('is-hidden');
    }
}

// Fallback component templates
const DEFAULT_HEADER_HTML = `
<header class="navbar">
    <div class="container nav-container">
        <div class="nav-left">
            <a href="{{ROOT}}index.html" class="brand">
                <span>Aavahan</span>
                <span class="brand-dot"></span>
            </a>

            <form class="header-search-bar" action="{{PAGES}}explore.html" method="GET">
                <div class="header-search-input-group">
                    <span class="material-symbols-outlined header-search-icon">search</span>
                    <input type="text" id="meetupSearchInput" name="search" class="header-search-input" placeholder="Search events">
                </div>
                <button type="submit" class="header-search-btn" aria-label="Search">
                    <span class="material-symbols-outlined header-search-submit-icon">search</span>
                </button>
            </form>
        </div>

        <div class="nav-right">
            <a href="{{PAGES}}create-event.html" class="nav-link-group">Start an Event</a>
            <a href="{{PAGES}}explore.html" class="nav-link-group">Explore</a>
            <a id="navLogin" href="{{PAGES}}login.html" class="nav-link-group">Log in</a>
            <a id="navSignup" href="{{PAGES}}signup.html" class="btn btn-primary btn-pill btn-sm">Sign up</a>
            <button id="navLogout" class="btn btn-outline btn-pill btn-sm is-hidden">Log out</button>
        </div>

        <button class="nav-toggle-btn" aria-label="Toggle navigation">
            <span class="material-symbols-outlined">menu</span>
        </button>
    </div>
</header>

<div class="mobile-nav-drawer">
    <div class="mobile-nav-links">
        <a href="{{ROOT}}index.html" class="mobile-nav-link">Home</a>
        <a href="{{PAGES}}explore.html" class="mobile-nav-link">Find Events</a>
        <a href="{{PAGES}}create-event.html" class="mobile-nav-link">Start an Event</a>
        <a href="{{PAGES}}dashboard.html" class="mobile-nav-link">Organizer Hub</a>
    </div>
    <div class="mobile-drawer-auth">
        <a href="{{PAGES}}login.html" class="btn btn-outline btn-block">Log in</a>
        <a href="{{PAGES}}signup.html" class="btn btn-primary btn-block">Sign up</a>
    </div>
</div>
`;

const DEFAULT_FOOTER_HTML = `
<footer class="footer">
    <div class="container">
        <div class="footer-bottom">
            <div class="footer-brand-wrap">
                <a href="{{ROOT}}index.html" class="brand footer-brand-link">
                    <span>Aavahan</span>
                    <span class="brand-dot"></span>
                </a>
                <span>© 2026 Aavahan, Inc. All rights reserved.</span>
            </div>
            <div class="footer-legal-links">
                <a href="{{PAGES}}explore.html" class="footer-link">Explore</a>
                <a href="#" class="footer-link">Terms of Service</a>
                <a href="#" class="footer-link">Privacy Policy</a>
            </div>
        </div>
    </div>
</footer>
`;

// Dynamic component loader
async function loadComponents() {
    const isSubfolder = window.location.pathname.includes('/pages/');
    const basePath = isSubfolder ? '../' : './';
    const rootPath = isSubfolder ? '../' : '';
    const pagesPath = isSubfolder ? '' : 'pages/';

    const headerContainer = document.getElementById('site-header') || 
                            document.getElementById('header-placeholder') || 
                            document.querySelector('[data-include="header"]');

    const footerContainer = document.getElementById('site-footer') || 
                            document.getElementById('footer-placeholder') || 
                            document.querySelector('[data-include="footer"]');

    const replacePaths = (html) => {
        return html
            .replace(/\{\{ROOT\}\}/g, rootPath)
            .replace(/\{\{PAGES\}\}/g, pagesPath);
    };

    if (headerContainer) {
        let headerHtml = null;
        try {
            let res = await fetch(`${basePath}components/header.html`);
            if (!res.ok) res = await fetch(`${basePath}header.html`);
            if (res.ok) headerHtml = await res.text();
        } catch (e) {
            // Local file protocol fallback
        }

        headerContainer.innerHTML = replacePaths(headerHtml || DEFAULT_HEADER_HTML);
        bindHeaderEvents();
        updateNavbar();
    }

    if (footerContainer) {
        let footerHtml = null;
        try {
            let res = await fetch(`${basePath}components/footer.html`);
            if (!res.ok) res = await fetch(`${basePath}footer.html`);
            if (res.ok) footerHtml = await res.text();
        } catch (e) {
            // Local file protocol fallback
        }

        footerContainer.innerHTML = replacePaths(footerHtml || DEFAULT_FOOTER_HTML);
    }
}

// Bind header events
function bindHeaderEvents() {
    const navToggleBtn = document.querySelector('.nav-toggle-btn');
    const mobileDrawer = document.querySelector('.mobile-nav-drawer');
    if (navToggleBtn && mobileDrawer) {
        navToggleBtn.onclick = () => {
            mobileDrawer.classList.toggle('open');
        };
    }

    const navLogoutBtn = document.getElementById('navLogout');
    if (navLogoutBtn) {
        navLogoutBtn.onclick = async (e) => {
            e.preventDefault();
            navLogoutBtn.disabled = true;
            if (typeof logoutUser === 'function') {
                await logoutUser();
            } else {
                clearAuth();
                window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
            }
        };
    }

    document.querySelectorAll('a[href*="create-event.html"]').forEach(link => {
        link.onclick = (e) => {
            if (!isAuthenticated()) {
                e.preventDefault();
                const isSubfolder = window.location.pathname.includes('/pages/');
                window.location.href = isSubfolder ? 'login.html?redirect=create-event.html' : 'pages/login.html?redirect=create-event.html';
            }
        };
    });
}

export { loadComponents, bindHeaderEvents, updateNavbar };

// Initialize
async function initApp() {
    await loadComponents();
    bindHeaderEvents();
    updateNavbar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
