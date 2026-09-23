import { getToken, getUser, isAuthenticated, clearAuth } from './authService.js';
import { 
    getEvents,
    getAdminUsers,
    updateUserRole,
    adminDeleteUser,
    adminDeleteEvent,
    getGroups,
    adminDeleteGroup,
    getAdminTransactions,
    logoutUser
} from './api.js';
import { showToast, escapeHtml } from './main.js';

// Admin panel logic

// Admin auth guard
(function checkAdminAccess() {
    if (!isAuthenticated()) { window.location.href = 'login.html?redirect=admin.html'; return; }
})();

// Sidebar profile hydration
(function hydrateSidebar() {
    var user = getUser() || {};
    var name = user.name || 'Admin';
    var nameEl   = document.getElementById('adminSidebarName');
    var avatarEl = document.getElementById('adminSidebarAvatar');
    if (nameEl)   nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name.split(' ').map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
})();

// Tab navigation
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

// Utility functions
function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function initials(name) {
    return (name || '?').split(' ').map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
}
function avatarEl(name) {
    return '<div class="admin-avatar">' + escapeHtml(initials(name)) + '</div>';
}

// Loading skeleton helper
function tableLoading(tbodyId, cols) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    var skeletonRow = '<tr>' + Array(cols).fill('<td><div class="skeleton-loader"></div></td>').join('') + '</tr>';
    tbody.innerHTML = skeletonRow.repeat(5);
}
function tableEmpty(tbodyId, cols, msg) {
    var tbody = document.getElementById(tbodyId);
    if (tbody) tbody.innerHTML = '<tr><td colspan="' + cols + '" class="admin-table-empty">' + msg + '</td></tr>';
}

// Overview stats and recent events
async function loadOverview() {
    try {
        var [evRes, usRes, grRes] = await Promise.all([
            getEvents(),
            getAdminUsers(),
            getGroups()
        ]);

        var events = (evRes.success && evRes.data) ? evRes.data : [];
        var users  = (usRes.success && usRes.data) ? usRes.data : [];
        var groups = (grRes.success && grRes.data) ? grRes.data : [];

        var navEvCount = document.querySelector('.admin-nav-item[data-tab="tabAdminEvents"] .nav-count');
        var navGrCount = document.querySelector('.admin-nav-item[data-tab="tabAdminGroups"] .nav-count');
        var navUsCount = document.querySelector('.admin-nav-item[data-tab="tabAdminUsers"] .nav-count');
        if (navEvCount) navEvCount.textContent = events.length;
        if (navGrCount) navGrCount.textContent = groups.length;
        if (navUsCount) navUsCount.textContent = users.length;

        setCounter('kpiTotalUsers',  users.length);
        setCounter('kpiTotalEvents', events.length);
        setCounter('kpiTotalGroups', groups.length);

        let totalGMV = 0;

        for (let event of events) {
            let price = Number(event.min_price);
            let attendees = Number(event.attendee_count);

            totalGMV = totalGMV + (price * attendees);
        }

        document.getElementById('kpiGrossVolume').textContent =
            'NPR ' + totalGMV.toLocaleString();

        var tbody = document.getElementById('adminPendingQueue');
        if (!tbody) return;
        var recent = events.slice().sort(function(a,b){ return new Date(b.created_at)-new Date(a.created_at); }).slice(0,5);
        if (!recent.length) { tableEmpty('adminPendingQueue', 4, 'No events yet.'); return; }
        tbody.innerHTML = recent.map(function(ev) {
            return '<tr>' +
                '<td><div class="admin-table-title">' + escapeHtml(ev.title) + '</div><div class="admin-table-sub">' + escapeHtml(ev.city || '—') + '</div></td>' +
                '<td>' + fmtDate(ev.event_date) + '</td>' +
                '<td><span class="mod-badge mod-badge-published">Published</span></td>' +
                '<td><div class="admin-action-btn-group">' +
                    '<a href="event-details.html?id=' + ev.id + '" target="_blank" class="btn btn-outline btn-sm admin-btn-xs">View</a>' +
                    '<button class="btn btn-sm btn-danger-light admin-btn-xs" data-action="delete-event" data-id="' + ev.id + '">Delete</button>' +
                '</div></td>' +
            '</tr>';
        }).join('');
    } catch(e) {
        console.error('Overview load error:', e);
        showToast('Could not load overview data.', 'error');
    }
}

function setCounter(id, target) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = (target || 0).toLocaleString();
}

// Events tab
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
            '<td><div class="admin-table-title admin-table-title-truncate">' + escapeHtml(ev.title) + '</div>' +
                '<div class="admin-table-sub">' + fmtDate(ev.event_date) + (ev.start_time ? ' · ' + ev.start_time.slice(0,5) : '') + '</div></td>' +
            '<td>' + escapeHtml(ev.city || '—') + '</td>' +
            '<td>' + (ev.attendee_count || 0) + '</td>' +
            '<td>' + priceTxt + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td><div class="admin-action-btn-group">' +
                '<a href="event-details.html?id=' + ev.id + '" target="_blank" class="btn btn-outline btn-sm admin-btn-xs">View</a>' +
                '<button class="btn btn-sm btn-danger-light admin-btn-xs" data-action="delete-event" data-id="' + ev.id + '">Delete</button>' +
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

// Groups tab
var allAdminGroups = [];

async function loadAdminGroups() {
    tableLoading('adminGroupsTableBody', 5);
    try {
        var data = await getGroups();
        allAdminGroups = (data.success && data.data) ? data.data : [];
        renderAdminGroups(allAdminGroups);
    } catch(e) {
        tableEmpty('adminGroupsTableBody', 5, 'Failed to load groups.');
    }
}

function renderAdminGroups(groups) {
    var tbody = document.getElementById('adminGroupsTableBody');
    if (!tbody) return;
    if (!groups.length) { tableEmpty('adminGroupsTableBody', 5, 'No groups found.'); return; }
    tbody.innerHTML = groups.map(function(g) {
        return '<tr>' +
            '<td><div class="admin-user-cell">' + avatarEl(g.name) + '<div><div class="admin-table-title">' + escapeHtml(g.name) + '</div><div class="admin-table-sub">' + escapeHtml(g.city || '—') + '</div></div></div></td>' +
            '<td>' + escapeHtml(g.category || '—') + '</td>' +
            '<td>' + (g.hosted_events_count || 0) + '</td>' +
            '<td><span class="mod-badge mod-badge-' + (g.is_public ? 'active' : 'suspended') + '">' + (g.is_public ? 'Public' : 'Private') + '</span></td>' +
            '<td><div class="admin-action-btn-group">' +
                '<button class="btn btn-sm btn-danger-light admin-btn-xs" data-action="delete-group" data-id="' + g.id + '">Delete</button>' +
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

// Users tab
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
            ? '<button class="btn btn-outline btn-sm admin-btn-xs" data-action="toggle-role" data-id="' + u.id + '" data-role="user">Demote</button>'
            : '<button class="btn btn-outline btn-sm admin-btn-xs" data-action="toggle-role" data-id="' + u.id + '" data-role="admin">Make Admin</button>';
        return '<tr>' +
            '<td><div class="admin-user-cell">' + avatarEl(u.name) + '<div><div class="admin-table-title">' + escapeHtml(u.name) + '</div><div class="admin-table-sub">' + escapeHtml(u.email) + '</div></div></div></td>' +
            '<td>' + roleBadge + '</td>' +
            '<td>' + fmtDate(u.created_at) + '</td>' +
            '<td>' + (u.total_rsvps || 0) + '</td>' +
            '<td><span class="mod-badge mod-badge-active">Active</span></td>' +
            '<td><div class="admin-action-btn-group">' + roleAction +
                '<button class="btn btn-sm btn-danger-light admin-btn-xs" data-action="delete-user" data-id="' + u.id + '">Delete</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');
}

async function toggleUserRole(userId, newRole, btn) {
    btn.disabled = true; btn.textContent = '…';
    var res = await updateUserRole(userId, newRole);
    if (res.success) {
        showToast('User role updated to ' + newRole + '.', 'success');
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

// Global search
var globalSearchEl = document.getElementById('globalAdminSearch');
if (globalSearchEl) {
    globalSearchEl.addEventListener('input', function() {
        var q = globalSearchEl.value.toLowerCase().trim();
        if (!q) return;
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

// Transactions and registrations tab
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
                : '<span class="mod-badge mod-badge-flagged">' + escapeHtml(tx.status) + '</span>';
            var formattedId = 'RSVP-' + String(tx.id).padStart(4, '0');

            return '<tr>' +
                '<td class="admin-mono-id">' + formattedId + '</td>' +
                '<td class="admin-cell-semibold">' + escapeHtml(tx.buyer || 'Community Member') + '</td>' +
                '<td>' + escapeHtml(tx.event || 'Meetup') + '</td>' +
                '<td class="admin-cell-bold">' + escapeHtml(tx.amount) + '</td>' +
                '<td>' + escapeHtml(tx.gateway || 'Direct RSVP') + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td><span class="admin-table-sub">' + fmtDate(tx.created_at) + '</span></td>' +
            '</tr>';
        }).join('');
    } catch (e) {
        console.log('Error loading admin transactions:', e);
        tableEmpty('adminTransactionsTableBody', 7, 'Failed to load transaction records.');
    }
}

// Export real dynamic platform report CSV
function exportAdminReportCSV() {
    if (!allAdminEvents || allAdminEvents.length === 0) {
        showToast('No platform events to export.', 'info');
        return;
    }

    var headers = ['Event ID', 'Title', 'Category', 'City', 'Venue', 'Date', 'Attendees', 'Min Price', 'Is Online'];
    var rows = allAdminEvents.map(function(ev) {
        return [
            ev.id,
            '"' + (ev.title || '').replace(/"/g, '""') + '"',
            '"' + (ev.category || '').replace(/"/g, '""') + '"',
            '"' + (ev.city || '').replace(/"/g, '""') + '"',
            '"' + (ev.venue || '').replace(/"/g, '""') + '"',
            ev.event_date || '',
            ev.attendee_count || 0,
            ev.min_price || 0,
            ev.is_online ? 'Yes' : 'No'
        ];
    });

    var csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(function(r){ return r.join(','); })].join('\n');
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'aavahan-platform-report.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Platform report exported successfully.', 'success');
}

// Boot
document.addEventListener('DOMContentLoaded', function() {
    loadOverview();
    loadAdminEvents();
    loadAdminGroups();
    loadAdminUsers();
    loadAdminTransactions();

    // Event delegation for pending queue
    var pendingQueue = document.getElementById('adminPendingQueue');
    if (pendingQueue) {
        pendingQueue.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action="delete-event"]');
            if (btn) {
                var id = Number(btn.getAttribute('data-id'));
                adminRemoveEvent(id, btn);
            }
        });
    }

    // Event delegation for events table
    var eventsTable = document.getElementById('adminEventsTableBody');
    if (eventsTable) {
        eventsTable.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action="delete-event"]');
            if (btn) {
                var id = Number(btn.getAttribute('data-id'));
                adminRemoveEvent(id, btn);
            }
        });
    }

    // Event delegation for groups table
    var groupsTable = document.getElementById('adminGroupsTableBody');
    if (groupsTable) {
        groupsTable.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action="delete-group"]');
            if (btn) {
                var id = Number(btn.getAttribute('data-id'));
                adminRemoveGroup(id, btn);
            }
        });
    }

    // Event delegation for users table
    var usersTable = document.getElementById('adminUsersTableBody');
    if (usersTable) {
        usersTable.addEventListener('click', function(e) {
            var toggleBtn = e.target.closest('[data-action="toggle-role"]');
            if (toggleBtn) {
                var userId = Number(toggleBtn.getAttribute('data-id'));
                var role = toggleBtn.getAttribute('data-role');
                toggleUserRole(userId, role, toggleBtn);
                return;
            }
            var delBtn = e.target.closest('[data-action="delete-user"]');
            if (delBtn) {
                var userId = Number(delBtn.getAttribute('data-id'));
                removeUser(userId, delBtn);
            }
        });
    }

    // Export report CSV
    var exportReportBtn = document.getElementById('btnExportAdminReport');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', exportAdminReportCSV);
    }


    // Admin logout link
    var logoutLink = document.getElementById('adminLogoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            logoutLink.style.pointerEvents = 'none';
            if (typeof logoutUser === 'function') {
                await logoutUser();
            } else {
                clearAuth();
                window.location.href = 'login.html';
            }
        });
    }
});
