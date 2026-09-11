// ============================================================
// Aavahan Core Client Scripts — main.js
// ============================================================

// ── Global Toast Notification System ─────────────────────────
function showToast(message, type = 'info') {
    let container = document.getElementById('aavGlobalToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'aavGlobalToastContainer';
        container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:999999;display:flex;flex-direction:column;gap:0.6rem;pointer-events:none;max-width:380px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `aav-toast aav-toast-${type}`;
    
    let bg = '#1e293b';
    let border = '#334155';
    let icon = 'info';
    let color = '#ffffff';

    if (type === 'success') {
        bg = '#064e3b';
        border = '#059669';
        icon = 'check_circle';
        color = '#a7f3d0';
    } else if (type === 'error') {
        bg = '#7f1d1d';
        border = '#dc2626';
        icon = 'error';
        color = '#fecaca';
    } else if (type === 'teal' || type === 'info') {
        bg = '#0f3d3e';
        border = '#00828a';
        icon = 'info';
        color = '#e6f7f7';
    }

    toast.style.cssText = `display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1.15rem;border-radius:10px;background:${bg};border:1px solid ${border};color:#ffffff;box-shadow:0 10px 30px rgba(0,0,0,0.35);font-size:0.875rem;font-weight:500;font-family:system-ui,-apple-system,sans-serif;pointer-events:auto;animation:aavToastIn 0.25s cubic-bezier(0.16,1,0.3,1);transition:opacity 0.25s ease,transform 0.25s ease;`;

    toast.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:20px;color:${color};flex-shrink:0;">${icon}</span>
        <span style="flex:1;line-height:1.4;">${message}</span>
        <button type="button" aria-label="Dismiss" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:0;display:flex;align-items:center;margin-left:0.25rem;">
            <span class="material-symbols-outlined" style="font-size:16px;">close</span>
        </button>
    `;

    const closeBtn = toast.querySelector('button');
    const dismiss = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => { toast.remove(); }, 260);
    };
    closeBtn.addEventListener('click', dismiss);

    container.appendChild(toast);
    setTimeout(dismiss, 3500);
}

// Attach to window so inline onclick handlers in all HTML pages can call it
window.showToast = showToast;

// Inject toast animation styles once
if (!document.getElementById('aavToastAnimationStyles')) {
    const style = document.createElement('style');
    style.id = 'aavToastAnimationStyles';
    style.textContent = `
        @keyframes aavToastIn {
            from { opacity: 0; transform: translateY(16px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
    `;
    document.head.appendChild(style);
}

// ── Navbar Auth State & Hydration ────────────────────────────
function updateNavbar() {
    const token = localStorage.getItem('aavahan_token') || sessionStorage.getItem('aavahan_token');
    const isLoggedIn = !!token;

    let user = {};
    try {
        user = JSON.parse(localStorage.getItem('aavahan_user') || '{}');
    } catch(e) {}

    if (!isLoggedIn) {
        sessionStorage.removeItem('aavahan_logged_in');
    }

    const navLogin  = document.getElementById('navLogin');
    const navSignup = document.getElementById('navSignup');
    const navLogout = document.getElementById('navLogout');

    if (!navLogin || !navSignup || !navLogout) return;

    const isSubfolder = window.location.pathname.includes('/pages/');

    if (isLoggedIn) {
        navLogin.style.display  = 'none';
        navSignup.style.display = 'none';
        navLogout.style.display = 'inline-flex';

        // Check if user is admin, show Admin Panel badge link
        let navAdmin = document.getElementById('navAdmin');
        if (user.role === 'admin') {
            if (!navAdmin) {
                navAdmin = document.createElement('a');
                navAdmin.id = 'navAdmin';
                navAdmin.className = 'nav-link-group';
                navAdmin.style.cssText = 'color:#00828a;font-weight:700;display:inline-flex;align-items:center;gap:4px;';
                navAdmin.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">admin_panel_settings</span> Admin';
                navAdmin.href = isSubfolder ? 'admin.html' : 'pages/admin.html';
                navLogout.parentNode.insertBefore(navAdmin, navLogout);
            } else {
                navAdmin.style.display = 'inline-flex';
            }
        } else if (navAdmin) {
            navAdmin.style.display = 'none';
        }
    } else {
        navLogin.style.display  = '';
        navSignup.style.display = '';
        navLogout.style.display = 'none';

        const navAdmin = document.getElementById('navAdmin');
        if (navAdmin) navAdmin.style.display = 'none';
    }
}

// ── Logout handler ───────────────────────────────────────────
const navLogoutBtn = document.getElementById('navLogout');
if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        navLogoutBtn.disabled = true;
        if (typeof logoutUser === 'function') {
            await logoutUser();
        } else {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
        }
    });
}

// ── Mobile Drawer Toggle ──────────────────────────────────────
const navToggleBtn = document.querySelector('.nav-toggle-btn');
const mobileDrawer = document.querySelector('.mobile-nav-drawer');
if (navToggleBtn && mobileDrawer) {
    navToggleBtn.addEventListener('click', () => {
        mobileDrawer.classList.toggle('open');
    });
}

// ── Require login when clicking "Start an Event" ───────────────
document.querySelectorAll('a[href*="create-event.html"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const token = localStorage.getItem('aavahan_token') || sessionStorage.getItem('aavahan_token');
        if (!token) {
            e.preventDefault();
            const isSubfolder = window.location.pathname.includes('/pages/');
            window.location.href = isSubfolder ? 'login.html?redirect=create-event.html' : 'pages/login.html?redirect=create-event.html';
        }
    });
});

// Run on page load
document.addEventListener('DOMContentLoaded', updateNavbar);
updateNavbar();
