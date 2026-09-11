// ============================================================
// Aavahan Admin Panel — admin.js
// ============================================================

// ── Toast Notification ──────────────────────────────────────
function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('adminToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'adminToastContainer';
        container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;display:flex;flex-direction:column;gap:0.5rem;z-index:9999;';
        document.body.appendChild(container);
    }
    var colors = { success: '#059669', error: '#dc2626', info: '#0284c7', warning: '#d97706' };
    var icons  = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
    var toast  = document.createElement('div');
    toast.style.cssText = 'display:flex;align-items:center;gap:0.65rem;background:#0f172a;color:#fff;padding:0.85rem 1.25rem;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.25);min-width:280px;max-width:380px;font-size:0.875rem;font-weight:500;animation:toastIn 0.2s ease;border-left:4px solid ' + (colors[type] || colors.info) + ';';
    toast.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;color:' + (colors[type] || colors.info) + ';">' + (icons[type] || icons.info) + '</span><span style="flex:1;">' + message + '</span>';
    container.appendChild(toast);

    if (!document.getElementById('toastKeyframes')) {
        var s = document.createElement('style'); s.id = 'toastKeyframes';
        s.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}';
        document.head.appendChild(s);
    }
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(function() { toast.remove(); }, 350); }, 3500);
}

// ── Admin Auth Guard ─────────────────────────────────────────
(function checkAdminAccess() {
    var token = localStorage.getItem('aavahan_token') || sessionStorage.getItem('aavahan_token');
    if (!token) { window.location.href = 'login.html?redirect=admin.html'; return; }
    // Decode JWT payload to check role (no verification needed client-side)
    try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        // We'll do a real check on first API call; this is just a quick guard
    } catch(e) {}
})();

// ── Sidebar Profile Hydration ────────────────────────────────
(function hydrateSidebar() {
    try {
        var user = JSON.parse(localStorage.getItem('aavahan_user') || '{}');
        var name = user.name || 'Admin';
        var nameEl   = document.getElementById('adminSidebarName');
        var avatarEl = document.getElementById('adminSidebarAvatar');
        if (nameEl)   nameEl.textContent = name;
        if (avatarEl) avatarEl.textContent = name.split(' ').map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
    } catch(e) {}
})();

// ── Tab Navigation ───────────────────────────────────────────
document.querySelectorAll('.admin-nav-item[data-tab]').forEach(function(item) {
    item.addEventListener('click', function() {
        document.querySelectorAll('.admin-nav-item').forEach(function(i) { i.classList.remove('active'); });
        document.querySelectorAll('.admin-tab-pane').forEach(function(p) { p.classList.remove('active'); });
        item.classList.add('active');
        var pane = document.getElementById(item.getAttribute('data-tab'));
        if (pane) pane.classList.add('active');
    });
});

// Mobile sidebar toggle
var toggleBtn = document.getElementById('btnToggleSidebar');
if (toggleBtn) toggleBtn.addEventListener('click', function() {
    document.getElementById('adminSidebar').classList.toggle('open');
});

// ── Utility ──────────────────────────────────────────────────
function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function initials(name) {
    return (name || '?').split(' ').map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
}
function avatarEl(name) {
    return '<div style="width:34px;height:34px;border-radius:50%;background:var(--teal);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">' + initials(name) + '</div>';
}

// ── Loading skeleton helper ───────────────────────────────────
function tableLoading(tbodyId, cols) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    var skeletonRow = '<tr>' + Array(cols).fill('<td><div style="height:14px;background:#f1f5f9;border-radius:4px;animation:pulse 1.2s infinite;"></div></td>').join('') + '</tr>';
    tbody.innerHTML = skeletonRow.repeat(5);
    if (!document.getElementById('pulseKf')) {
        var s = document.createElement('style'); s.id = 'pulseKf';
        s.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}';
        document.head.appendChild(s);
    }
}
function tableEmpty(tbodyId, cols, msg) {
    var tbody = document.getElementById(tbodyId);
    if (tbody) tbody.innerHTML = '<tr><td colspan="' + cols + '" style="text-align:center;padding:2.5rem;color:var(--admin-text-muted);">' + msg + '</td></tr>';
}

// ── OVERVIEW: Stat Cards + Recent Events Queue ────────────────
async function loadOverview() {
    try {
        // Fetch counts in parallel
        var [evRes, usRes, grRes] = await Promise.all([
            fetch('http://localhost:3001/api/v1/events', { headers: getHeaders() }).then(function(r){ return r.json(); }),
            getAdminUsers(),
            getGroups()
        ]);

        var events = (evRes.success && evRes.data) ? evRes.data : [];
        var users  = (usRes.success && usRes.data) ? usRes.data : [];
        var groups = (grRes.success && grRes.data) ? grRes.data : [];

        // Update sidebar nav counts
        var navEvCount = document.querySelector('.admin-nav-item[data-tab="tabAdminEvents"] .nav-count');
        var navGrCount = document.querySelector('.admin-nav-item[data-tab="tabAdminGroups"] .nav-count');
        var navUsCount = document.querySelector('.admin-nav-item[data-tab="tabAdminUsers"] .nav-count');
        if (navEvCount) navEvCount.textContent = events.length;
        if (navGrCount) navGrCount.textContent = groups.length;
        if (navUsCount) navUsCount.textContent = users.length;

        // Update KPI cards (real data for events/users/groups; GMV is mock)
        animateCounter('kpiTotalUsers',  users.length);
        animateCounter('kpiTotalEvents', events.length);
        animateCounter('kpiTotalGroups', groups.length);

        // Pending queue: show 5 most recent events (newest first)
        var tbody = document.getElementById('adminPendingQueue');
        if (!tbody) return;
        var recent = events.slice().sort(function(a,b){ return new Date(b.created_at)-new Date(a.created_at); }).slice(0,5);
        if (!recent.length) { tableEmpty('adminPendingQueue', 4, 'No events yet.'); return; }
        tbody.innerHTML = recent.map(function(ev) {
            return '<tr>' +
                '<td><div style="font-weight:700;">' + ev.title + '</div><div style="font-size:0.78rem;color:var(--admin-text-muted);">' + (ev.city || '—') + '</div></td>' +
                '<td>' + fmtDate(ev.event_date) + '</td>' +
                '<td><span class="mod-badge mod-badge-published">Published</span></td>' +
                '<td><div class="admin-action-btn-group">' +
                    '<button class="btn btn-outline btn-sm" style="font-size:0.78rem;padding:0.2rem 0.6rem;" onclick="window.open(\'event-details.html?id=' + ev.id + '\',\'_blank\')">View</button>' +
                    '<button class="btn btn-sm" style="font-size:0.78rem;padding:0.2rem 0.6rem;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;" onclick="adminRemoveEvent(' + ev.id + ', this)">Delete</button>' +
                '</div></td>' +
            '</tr>';
        }).join('');
    } catch(e) {
        console.error('Overview load error:', e);
        showToast('Could not load overview data.', 'error');
    }
}

function animateCounter(id, target) {
    var el = document.getElementById(id);
    if (!el) return;
    var start = 0, duration = 800, step = Math.ceil(target / (duration / 16));
    var timer = setInterval(function() {
        start += step;
        if (start >= target) { start = target; clearInterval(timer); }
        el.textContent = start.toLocaleString();
    }, 16);
}

// ── EVENTS TAB ────────────────────────────────────────────────
var allAdminEvents = [];

async function loadAdminEvents() {
    tableLoading('adminEventsTableBody', 6);
    try {
        var data = await getEvents();
        allAdminEvents = (data.success && data.data) ? data.data : [];
        renderAdminEvents(allAdminEvents);
    } catch(e) {
        tableEmpty('adminEventsTableBody', 6, 'Failed to load events.');
    }
}

function renderAdminEvents(events) {
    var tbody = document.getElementById('adminEventsTableBody');
    if (!tbody) return;
    if (!events.length) { tableEmpty('adminEventsTableBody', 6, 'No events found.'); return; }
    tbody.innerHTML = events.map(function(ev) {
        var statusBadge = ev.is_online
            ? '<span class="mod-badge mod-badge-featured">Online</span>'
            : '<span class="mod-badge mod-badge-published">In-Person</span>';
        var priceTxt = (ev.is_free || !ev.min_price || ev.min_price == 0) ? 'Free' : 'NPR ' + Number(ev.min_price).toLocaleString();
        return '<tr>' +
            '<td><div style="font-weight:700;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + ev.title + '</div>' +
                '<div style="font-size:0.75rem;color:var(--admin-text-muted);">' + fmtDate(ev.event_date) + (ev.start_time ? ' · ' + ev.start_time.slice(0,5) : '') + '</div></td>' +
            '<td>' + (ev.city || '—') + '</td>' +
            '<td>' + (ev.attendee_count || 0) + '</td>' +
            '<td>' + priceTxt + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td><div class="admin-action-btn-group">' +
                '<button class="btn btn-outline btn-sm" style="font-size:0.78rem;padding:0.2rem 0.6rem;" onclick="window.open(\'event-details.html?id=' + ev.id + '\',\'_blank\')">View</button>' +
                '<button class="btn btn-sm" style="font-size:0.78rem;padding:0.2rem 0.6rem;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;" onclick="adminRemoveEvent(' + ev.id + ', this)">Delete</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');
}

async function adminRemoveEvent(id, btn) {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    btn.disabled = true; btn.textContent = '…';
    var res = await adminDeleteEvent(id);
    if (res.success) {
        showToast('Event deleted.', 'success');
        allAdminEvents = allAdminEvents.filter(function(e){ return e.id !== id; });
        renderAdminEvents(allAdminEvents);
        loadOverview();
    } else {
        showToast(res.message || 'Delete failed.', 'error');
        btn.disabled = false; btn.textContent = 'Delete';
    }
}

// Events search
var evSearchDebounce;
var evSearchEl = document.getElementById('searchAdminEvents');
if (evSearchEl) {
    evSearchEl.addEventListener('input', function() {
        clearTimeout(evSearchDebounce);
        evSearchDebounce = setTimeout(function() {
            var q = evSearchEl.value.toLowerCase().trim();
            renderAdminEvents(q ? allAdminEvents.filter(function(e){ return e.title.toLowerCase().includes(q) || (e.city||'').toLowerCase().includes(q); }) : allAdminEvents);
        }, 250);
    });
}

// ── GROUPS TAB ────────────────────────────────────────────────
var allAdminGroups = [];

async function loadAdminGroups() {
    tableLoading('adminGroupsTableBody', 6);
    try {
        var data = await getGroups();
        allAdminGroups = (data.success && data.data) ? data.data : [];
        renderAdminGroups(allAdminGroups);
    } catch(e) {
        tableEmpty('adminGroupsTableBody', 6, 'Failed to load groups.');
    }
}

function renderAdminGroups(groups) {
    var tbody = document.getElementById('adminGroupsTableBody');
    if (!tbody) return;
    if (!groups.length) { tableEmpty('adminGroupsTableBody', 6, 'No groups found.'); return; }
    tbody.innerHTML = groups.map(function(g) {
        return '<tr>' +
            '<td><div style="display:flex;align-items:center;gap:0.65rem;">' + avatarEl(g.name) + '<div><div style="font-weight:700;">' + g.name + '</div><div style="font-size:0.75rem;color:var(--admin-text-muted);">' + (g.city || '—') + '</div></div></div></td>' +
            '<td>' + (g.category || '—') + '</td>' +
            '<td>' + (g.member_count || 0).toLocaleString() + '</td>' +
            '<td>—</td>' +
            '<td><span class="mod-badge mod-badge-' + (g.is_public ? 'active' : 'suspended') + '">' + (g.is_public ? 'Public' : 'Private') + '</span></td>' +
            '<td><div class="admin-action-btn-group">' +
                '<button class="btn btn-sm" style="font-size:0.78rem;padding:0.2rem 0.6rem;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;" onclick="adminRemoveGroup(' + g.id + ', this)">Delete</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');
}

async function adminRemoveGroup(id, btn) {
    if (!confirm('Delete this group? This cannot be undone.')) return;
    btn.disabled = true; btn.textContent = '…';
    var res = await adminDeleteGroup(id);
    if (res.success) {
        showToast('Group deleted.', 'success');
        allAdminGroups = allAdminGroups.filter(function(g){ return g.id !== id; });
        renderAdminGroups(allAdminGroups);
        loadOverview();
    } else {
        showToast(res.message || 'Delete failed.', 'error');
        btn.disabled = false; btn.textContent = 'Delete';
    }
}

// Groups search
var grSearchDebounce;
var grSearchEl = document.getElementById('searchAdminGroups');
if (grSearchEl) {
    grSearchEl.addEventListener('input', function() {
        clearTimeout(grSearchDebounce);
        grSearchDebounce = setTimeout(function() {
            var q = grSearchEl.value.toLowerCase().trim();
            renderAdminGroups(q ? allAdminGroups.filter(function(g){ return g.name.toLowerCase().includes(q) || (g.city||'').toLowerCase().includes(q) || (g.category||'').toLowerCase().includes(q); }) : allAdminGroups);
        }, 250);
    });
}

// ── USERS TAB ─────────────────────────────────────────────────
var allAdminUsers = [];

async function loadAdminUsers() {
    tableLoading('adminUsersTableBody', 6);
    try {
        var data = await getAdminUsers();
        if (!data.success) {
            tableEmpty('adminUsersTableBody', 6, 'Access denied. Admin privileges required.');
            showToast(data.message || 'Not authorized.', 'error');
            return;
        }
        allAdminUsers = data.data || [];
        renderAdminUsers(allAdminUsers);
    } catch(e) {
        tableEmpty('adminUsersTableBody', 6, 'Failed to load users.');
    }
}

function renderAdminUsers(users) {
    var tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    if (!users.length) { tableEmpty('adminUsersTableBody', 6, 'No users found.'); return; }
    tbody.innerHTML = users.map(function(u) {
        var isAdmin = u.role === 'admin';
        var roleBadge = isAdmin
            ? '<span class="mod-badge mod-badge-featured">Admin</span>'
            : '<span class="mod-badge mod-badge-active">User</span>';
        var roleAction = isAdmin
            ? '<button class="btn btn-outline btn-sm" style="font-size:0.78rem;padding:0.2rem 0.6rem;" onclick="toggleUserRole(' + u.id + ', \'user\', this)">Demote</button>'
            : '<button class="btn btn-outline btn-sm" style="font-size:0.78rem;padding:0.2rem 0.6rem;" onclick="toggleUserRole(' + u.id + ', \'admin\', this)">Make Admin</button>';
        return '<tr>' +
            '<td><div style="display:flex;align-items:center;gap:0.65rem;">' + avatarEl(u.name) + '<div><div style="font-weight:700;">' + u.name + '</div><div style="font-size:0.75rem;color:var(--admin-text-muted);">' + u.email + '</div></div></div></td>' +
            '<td>' + roleBadge + '</td>' +
            '<td>' + fmtDate(u.created_at) + '</td>' +
            '<td>—</td>' +
            '<td><span class="mod-badge mod-badge-active">Active</span></td>' +
            '<td><div class="admin-action-btn-group">' + roleAction +
                '<button class="btn btn-sm" style="font-size:0.78rem;padding:0.2rem 0.6rem;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;" onclick="removeUser(' + u.id + ', this)">Delete</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');
}

async function toggleUserRole(userId, newRole, btn) {
    btn.disabled = true; btn.textContent = '…';
    var res = await updateUserRole(userId, newRole);
    if (res.success) {
        showToast('User role updated to ' + newRole + '.', 'success');
        // Update in local array and re-render
        allAdminUsers = allAdminUsers.map(function(u){ return u.id === userId ? Object.assign({}, u, { role: newRole }) : u; });
        renderAdminUsers(allAdminUsers);
    } else {
        showToast(res.message || 'Update failed.', 'error');
        btn.disabled = false; btn.textContent = newRole === 'admin' ? 'Make Admin' : 'Demote';
    }
}

async function removeUser(userId, btn) {
    if (!confirm('Permanently delete this user account? This cannot be undone.')) return;
    btn.disabled = true; btn.textContent = '…';
    var res = await adminDeleteUser(userId);
    if (res.success) {
        showToast('User deleted.', 'success');
        allAdminUsers = allAdminUsers.filter(function(u){ return u.id !== userId; });
        renderAdminUsers(allAdminUsers);
        loadOverview();
    } else {
        showToast(res.message || 'Delete failed.', 'error');
        btn.disabled = false; btn.textContent = 'Delete';
    }
}

// Users search
var usSearchDebounce;
var usSearchEl = document.getElementById('searchAdminUsers');
if (usSearchEl) {
    usSearchEl.addEventListener('input', function() {
        clearTimeout(usSearchDebounce);
        usSearchDebounce = setTimeout(function() {
            var q = usSearchEl.value.toLowerCase().trim();
            renderAdminUsers(q ? allAdminUsers.filter(function(u){ return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q); }) : allAdminUsers);
        }, 250);
    });
}

// ── Global Search (header) ────────────────────────────────────
var globalSearchEl = document.getElementById('globalAdminSearch');
if (globalSearchEl) {
    globalSearchEl.addEventListener('input', function() {
        var q = globalSearchEl.value.toLowerCase().trim();
        if (!q) return;
        // Switch to the most relevant tab and filter
        // Simple heuristic: search events first
        var matchedEvents = allAdminEvents.filter(function(e){ return e.title.toLowerCase().includes(q); });
        if (matchedEvents.length) {
            document.querySelector('.admin-nav-item[data-tab="tabAdminEvents"]').click();
            renderAdminEvents(matchedEvents);
            return;
        }
        var matchedUsers = allAdminUsers.filter(function(u){ return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q); });
        if (matchedUsers.length) {
            document.querySelector('.admin-nav-item[data-tab="tabAdminUsers"]').click();
            renderAdminUsers(matchedUsers);
        }
    });
}

// ── Transactions & Registrations Tab ──────────────────────────
async function loadAdminTransactions() {
    var tbody = document.getElementById('adminTransactionsTableBody');
    if (!tbody) return;
    tableLoading('adminTransactionsTableBody', 7);

    try {
        var res = await getAdminTransactions();
        var txList = (res && res.success && Array.isArray(res.data)) ? res.data : [];

        if (!txList.length) {
            tableEmpty('adminTransactionsTableBody', 7, 'No registrations or transactions recorded yet.');
            return;
        }

        tbody.innerHTML = txList.map(function(tx) {
            var isConfirmed = tx.status === 'confirmed' || tx.status === 'checked_in';
            var statusBadge = isConfirmed
                ? '<span class="mod-badge mod-badge-published">' + (tx.status === 'checked_in' ? 'Checked In' : 'Confirmed') + '</span>'
                : '<span class="mod-badge mod-badge-flagged">' + tx.status + '</span>';
            var formattedId = 'RSVP-' + String(tx.id).padStart(4, '0');

            return '<tr>' +
                '<td style="font-family:monospace;font-size:0.8rem;color:var(--admin-text-muted);">' + formattedId + '</td>' +
                '<td style="font-weight:600;">' + (tx.buyer || 'Community Member') + '</td>' +
                '<td>' + (tx.event || 'Meetup') + '</td>' +
                '<td style="font-weight:700;">' + tx.amount + '</td>' +
                '<td>' + (tx.gateway || 'Direct RSVP') + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td><span style="font-size:0.75rem;color:var(--admin-text-muted);">' + fmtDate(tx.created_at) + '</span></td>' +
            '</tr>';
        }).join('');
    } catch (e) {
        console.warn('Error loading admin transactions:', e);
        tableEmpty('adminTransactionsTableBody', 7, 'Failed to load transaction records.');
    }
}

// ── Boot ──────────────────────────────────────────────────────
// Bind handlers to window to ensure inline onclick handlers work in all environments
window.adminRemoveEvent = adminRemoveEvent;
window.adminRemoveGroup = adminRemoveGroup;
window.toggleUserRole = toggleUserRole;
window.removeUser = removeUser;
window.showToast = showToast;

document.addEventListener('DOMContentLoaded', function() {
    loadOverview();
    loadAdminEvents();
    loadAdminGroups();
    loadAdminUsers();
    loadAdminTransactions();
});
