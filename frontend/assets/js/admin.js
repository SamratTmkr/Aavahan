import { getUser, isAuthenticated } from './authService.js';
import {
    getEvents,
    getAdminUsers,
    updateUserRole,
    adminDeleteUser,
    adminDeleteEvent,
    logoutUser
} from './api.js';
import { showToast, escapeHtml } from './main.js';

//admin panel logic

//admin authentication check
(function checkAdminAccess() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html?redirect=admin.html';
        return;
    }
})();

//load user information into sidebar
(function loadSidebarProfile() {
    const user = getUser() || {};
    const name = user.name || 'Admin';

    const nameEl = document.getElementById('adminSidebarName');
    const avatarEl = document.getElementById('adminSidebarAvatar');

    if (nameEl) {
        nameEl.textContent = name;
    }

    if (avatarEl) {
        avatarEl.textContent = getInitials(name);
    }
})();

//tab navigation
document.querySelectorAll('.admin-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
        document
            .querySelectorAll('.admin-nav-item')
            .forEach(navItem => navItem.classList.remove('active'));

        document
            .querySelectorAll('.admin-tab-pane')
            .forEach(pane => pane.classList.remove('active'));

        item.classList.add('active');

        const pane = document.getElementById(
            item.getAttribute('data-tab')
        );

        if (pane) {
            pane.classList.add('active');
        }
    });
});

//mobile sidebar toggle
const toggleBtn = document.getElementById('btnToggleSidebar');

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        document
            .getElementById('adminSidebar')
            .classList.toggle('open');
    });
}

//utility functions

function fmtDate(dateStr) {
    if (!dateStr) {
        return '—';
    }

    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function getInitials(name) {
    return (name || '?')
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function avatarEl(name) {
    return (
        '<div class="admin-avatar">' +
        escapeHtml(getInitials(name)) +
        '</div>'
    );
}

//loading helpers
function tableLoading(tbodyId, columns) {
    const tbody = document.getElementById(tbodyId);

    if (!tbody) {
        return;
    }

    const row =
        '<tr>' +
        Array(columns)
            .fill('<td><div class="skeleton-loader"></div></td>')
            .join('') +
        '</tr>';

    tbody.innerHTML = row.repeat(5);
}

function tableEmpty(tbodyId, columns, message) {
    const tbody = document.getElementById(tbodyId);

    if (tbody) {
        tbody.innerHTML =
            '<tr>' +
            '<td colspan="' +
            columns +
            '" class="admin-table-empty">' +
            message +
            '</td>' +
            '</tr>';
    }
}

//overview
async function loadOverview() {
    try {
        const [eventResponse, userResponse] = await Promise.all([
            getEvents(),
            getAdminUsers()
        ]);

        const events =
            eventResponse.success && eventResponse.data
                ? eventResponse.data
                : [];

        const users =
            userResponse.success && userResponse.data
                ? userResponse.data
                : [];

        const eventCount = document.querySelector(
            '.admin-nav-item[data-tab="tabAdminEvents"] .nav-count'
        );

        const userCount = document.querySelector(
            '.admin-nav-item[data-tab="tabAdminUsers"] .nav-count'
        );

        if (eventCount) {
            eventCount.textContent = events.length;
        }

        if (userCount) {
            userCount.textContent = users.length;
        }

        setCounter('kpiTotalUsers', users.length);
        setCounter('kpiTotalEvents', events.length);

        const tbody = document.getElementById('adminPendingQueue');

        if (!tbody) {
            return;
        }

        const recentEvents = events
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.created_at) -
                    new Date(a.created_at)
            )
            .slice(0, 5);

        if (!recentEvents.length) {
            tableEmpty(
                'adminPendingQueue',
                4,
                'No events yet.'
            );
            return;
        }

        tbody.innerHTML = recentEvents
            .map(event => {
                return (
                    '<tr>' +
                    '<td>' +
                    '<div class="admin-table-title">' +
                    escapeHtml(event.title) +
                    '</div>' +
                    '<div class="admin-table-sub">' +
                    escapeHtml(event.city || '—') +
                    '</div>' +
                    '</td>' +

                    '<td>' +
                    fmtDate(event.event_date) +
                    '</td>' +

                    '<td>' +
                    '<span class="mod-badge mod-badge-published">Published</span>' +
                    '</td>' +

                    '<td>' +
                    '<div class="admin-action-btn-group">' +

                    '<a href="event-details.html?id=' +
                    event.id +
                    '" target="_blank" class="btn btn-outline btn-sm admin-btn-xs">View</a>' +

                    '<button class="btn btn-sm btn-danger-light admin-btn-xs" ' +
                    'data-action="delete-event" data-id="' +
                    event.id +
                    '">Delete</button>' +

                    '</div>' +
                    '</td>' +

                    '</tr>'
                );
            })
            .join('');
    } catch (error) {
        console.error('Overview load error:', error);
        showToast(
            'Could not load overview data.',
            'error'
        );
    }
}

function setCounter(id, value) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent = (value || 0).toLocaleString();
}

//events
let allAdminEvents = [];

async function loadAdminEvents() {
    tableLoading('adminEventsTableBody', 6);

    try {
        const data = await getEvents();

        allAdminEvents =
            data.success && data.data
                ? data.data
                : [];

        renderAdminEvents(allAdminEvents);
    } catch (error) {
        tableEmpty(
            'adminEventsTableBody',
            6,
            'Failed to load events.'
        );
    }
}

function renderAdminEvents(events) {
    const tbody = document.getElementById(
        'adminEventsTableBody'
    );

    if (!tbody) {
        return;
    }

    if (!events.length) {
        tableEmpty(
            'adminEventsTableBody',
            6,
            'No events found.'
        );
        return;
    }

    tbody.innerHTML = events
        .map(event => {
            const statusBadge = event.is_online
                ? '<span class="mod-badge mod-badge-featured">Online</span>'
                : '<span class="mod-badge mod-badge-published">In-Person</span>';

            const priceText =
                event.is_free ||
                !event.min_price ||
                event.min_price == 0
                    ? 'Free'
                    : 'NPR ' +
                      Number(event.min_price).toLocaleString();

            return (
                '<tr>' +

                '<td>' +
                '<div class="admin-table-title admin-table-title-truncate">' +
                escapeHtml(event.title) +
                '</div>' +
                '<div class="admin-table-sub">' +
                fmtDate(event.event_date) +
                (event.start_time
                    ? ' · ' + event.start_time.slice(0, 5)
                    : '') +
                '</div>' +
                '</td>' +

                '<td>' +
                escapeHtml(event.city || '—') +
                '</td>' +

                '<td>' +
                (event.attendee_count || 0) +
                '</td>' +

                '<td>' +
                priceText +
                '</td>' +

                '<td>' +
                statusBadge +
                '</td>' +

                '<td>' +
                '<div class="admin-action-btn-group">' +

                '<a href="event-details.html?id=' +
                event.id +
                '" target="_blank" class="btn btn-outline btn-sm admin-btn-xs">View</a>' +

                '<button class="btn btn-sm btn-danger-light admin-btn-xs" ' +
                'data-action="delete-event" data-id="' +
                event.id +
                '">Delete</button>' +

                '</div>' +
                '</td>' +

                '</tr>'
            );
        })
        .join('');
}

async function adminRemoveEvent(id, button) {
    if (!confirm('Delete this event? This cannot be undone.')) {
        return;
    }

    button.disabled = true;
    button.textContent = '…';

    const response = await adminDeleteEvent(id);

    if (response.success) {
        showToast('Event deleted.', 'success');

        allAdminEvents = allAdminEvents.filter(
            event => event.id !== id
        );

        renderAdminEvents(allAdminEvents);
        loadOverview();
    } else {
        showToast(
            response.message || 'Delete failed.',
            'error'
        );

        button.disabled = false;
        button.textContent = 'Delete';
    }
}

//events search
let eventSearchTimer;

const eventSearchInput = document.getElementById(
    'searchAdminEvents'
);

if (eventSearchInput) {
    eventSearchInput.addEventListener('input', () => {
        clearTimeout(eventSearchTimer);

        eventSearchTimer = setTimeout(() => {
            const query =
                eventSearchInput.value
                    .toLowerCase()
                    .trim();

            const filteredEvents = query
                ? allAdminEvents.filter(
                      event =>
                          event.title
                              .toLowerCase()
                              .includes(query) ||
                          (event.city || '')
                              .toLowerCase()
                              .includes(query)
                  )
                : allAdminEvents;

            renderAdminEvents(filteredEvents);
        }, 250);
    });
}

//users
let allAdminUsers = [];

async function loadAdminUsers() {
    tableLoading('adminUsersTableBody', 6);

    try {
        const data = await getAdminUsers();

        if (!data.success) {
            tableEmpty(
                'adminUsersTableBody',
                6,
                'Access denied. Admin privileges required.'
            );

            showToast(
                data.message || 'Not authorized.',
                'error'
            );

            return;
        }

        allAdminUsers = data.data || [];

        renderAdminUsers(allAdminUsers);
    } catch (error) {
        tableEmpty(
            'adminUsersTableBody',
            6,
            'Failed to load users.'
        );
    }
}

function renderAdminUsers(users) {
    const tbody = document.getElementById(
        'adminUsersTableBody'
    );

    if (!tbody) {
        return;
    }

    if (!users.length) {
        tableEmpty(
            'adminUsersTableBody',
            6,
            'No users found.'
        );
        return;
    }

    tbody.innerHTML = users
        .map(user => {
            const isAdmin = user.role === 'admin';

            const roleBadge = isAdmin
                ? '<span class="mod-badge mod-badge-featured">Admin</span>'
                : '<span class="mod-badge mod-badge-active">User</span>';

            const roleAction = isAdmin
                ? '<button class="btn btn-outline btn-sm admin-btn-xs" ' +
                  'data-action="toggle-role" data-id="' +
                  user.id +
                  '" data-role="user">Demote</button>'
                : '<button class="btn btn-outline btn-sm admin-btn-xs" ' +
                  'data-action="toggle-role" data-id="' +
                  user.id +
                  '" data-role="admin">Make Admin</button>';

            return (
                '<tr>' +

                '<td>' +
                '<div class="admin-user-cell">' +

                avatarEl(user.name) +

                '<div>' +
                '<div class="admin-table-title">' +
                escapeHtml(user.name) +
                '</div>' +

                '<div class="admin-table-sub">' +
                escapeHtml(user.email) +
                '</div>' +

                '</div>' +
                '</div>' +
                '</td>' +

                '<td>' +
                roleBadge +
                '</td>' +

                '<td>' +
                fmtDate(user.created_at) +
                '</td>' +

                '<td>' +
                (user.total_rsvps || 0) +
                '</td>' +

                '<td>' +
                '<span class="mod-badge mod-badge-active">Active</span>' +
                '</td>' +

                '<td>' +
                '<div class="admin-action-btn-group">' +

                roleAction +

                '<button class="btn btn-sm btn-danger-light admin-btn-xs" ' +
                'data-action="delete-user" data-id="' +
                user.id +
                '">Delete</button>' +

                '</div>' +
                '</td>' +

                '</tr>'
            );
        })
        .join('');
}

async function toggleUserRole(userId, newRole, button) {
    button.disabled = true;
    button.textContent = '…';

    const response = await updateUserRole(
        userId,
        newRole
    );

    if (response.success) {
        showToast(
            'User role updated to ' +
                newRole +
                '.',
            'success'
        );

        allAdminUsers = allAdminUsers.map(user =>
            user.id === userId
                ? { ...user, role: newRole }
                : user
        );

        renderAdminUsers(allAdminUsers);
    } else {
        showToast(
            response.message || 'Update failed.',
            'error'
        );

        button.disabled = false;

        button.textContent =
            newRole === 'admin'
                ? 'Make Admin'
                : 'Demote';
    }
}

async function removeUser(userId, button) {
    if (
        !confirm(
            'Permanently delete this user account? This cannot be undone.'
        )
    ) {
        return;
    }

    button.disabled = true;
    button.textContent = '…';

    const response = await adminDeleteUser(userId);

    if (response.success) {
        showToast('User deleted.', 'success');

        allAdminUsers = allAdminUsers.filter(
            user => user.id !== userId
        );

        renderAdminUsers(allAdminUsers);
        loadOverview();
    } else {
        showToast(
            response.message || 'Delete failed.',
            'error'
        );

        button.disabled = false;
        button.textContent = 'Delete';
    }
}

//users search
let userSearchTimer;

const userSearchInput = document.getElementById(
    'searchAdminUsers'
);

if (userSearchInput) {
    userSearchInput.addEventListener('input', () => {
        clearTimeout(userSearchTimer);

        userSearchTimer = setTimeout(() => {
            const query =
                userSearchInput.value
                    .toLowerCase()
                    .trim();

            const filteredUsers = query
                ? allAdminUsers.filter(
                      user =>
                          user.name
                              .toLowerCase()
                              .includes(query) ||
                          user.email
                              .toLowerCase()
                              .includes(query)
                  )
                : allAdminUsers;

            renderAdminUsers(filteredUsers);
        }, 250);
    });
}

//global search
const globalSearchInput = document.getElementById(
    'globalAdminSearch'
);

if (globalSearchInput) {
    globalSearchInput.addEventListener('input', () => {
        const query =
            globalSearchInput.value
                .toLowerCase()
                .trim();

        if (!query) {
            return;
        }

        const matchedEvents = allAdminEvents.filter(
            event =>
                event.title
                    .toLowerCase()
                    .includes(query)
        );

        if (matchedEvents.length) {
            document
                .querySelector(
                    '.admin-nav-item[data-tab="tabAdminEvents"]'
                )
                .click();

            renderAdminEvents(matchedEvents);
            return;
        }

        const matchedUsers = allAdminUsers.filter(
            user =>
                user.name
                    .toLowerCase()
                    .includes(query) ||
                user.email
                    .toLowerCase()
                    .includes(query)
        );

        if (matchedUsers.length) {
            document
                .querySelector(
                    '.admin-nav-item[data-tab="tabAdminUsers"]'
                )
                .click();

            renderAdminUsers(matchedUsers);
        }
    });
}

//export report as csv
function exportAdminReportCSV() {
    if (!allAdminEvents.length) {
        showToast(
            'No platform events to export.',
            'info'
        );
        return;
    }

    const headers = [
        'Event ID',
        'Title',
        'Category',
        'City',
        'Venue',
        'Date',
        'Attendees',
        'Min Price',
        'Is Online'
    ];

    const rows = allAdminEvents.map(event => [
        event.id,
        '"' +
            (event.title || '').replace(/"/g, '""') +
            '"',
        '"' +
            (event.category || '').replace(/"/g, '""') +
            '"',
        '"' +
            (event.city || '').replace(/"/g, '""') +
            '"',
        '"' +
            (event.venue || '').replace(/"/g, '""') +
            '"',
        event.event_date || '',
        event.attendee_count || 0,
        event.min_price || 0,
        event.is_online ? 'Yes' : 'No'
    ]);

    const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

    const encodedUri = encodeURI(csvContent);

    const link = document.createElement('a');

    link.setAttribute('href', encodedUri);
    link.setAttribute(
        'download',
        'aavahan-platform-report.csv'
    );

    document.body.appendChild(link);

    link.click();

    link.remove();

    showToast(
        'Platform report exported successfully.',
        'success'
    );
}

//page setup
document.addEventListener('DOMContentLoaded', () => {
    loadOverview();
    loadAdminEvents();
    loadAdminUsers();

    //pending events table
    const pendingQueue = document.getElementById(
        'adminPendingQueue'
    );

    if (pendingQueue) {
        pendingQueue.addEventListener('click', event => {
            const button = event.target.closest(
                '[data-action="delete-event"]'
            );

            if (!button) {
                return;
            }

            const id = Number(
                button.getAttribute('data-id')
            );

            adminRemoveEvent(id, button);
        });
    }

    //events table
    const eventsTable = document.getElementById(
        'adminEventsTableBody'
    );

    if (eventsTable) {
        eventsTable.addEventListener('click', event => {
            const button = event.target.closest(
                '[data-action="delete-event"]'
            );

            if (!button) {
                return;
            }

            const id = Number(
                button.getAttribute('data-id')
            );

            adminRemoveEvent(id, button);
        });
    }

    //users table
    const usersTable = document.getElementById(
        'adminUsersTableBody'
    );

    if (usersTable) {
        usersTable.addEventListener('click', event => {
            const roleButton = event.target.closest(
                '[data-action="toggle-role"]'
            );

            if (roleButton) {
                const userId = Number(
                    roleButton.getAttribute('data-id')
                );

                const role =
                    roleButton.getAttribute('data-role');

                toggleUserRole(
                    userId,
                    role,
                    roleButton
                );

                return;
            }

            const deleteButton = event.target.closest(
                '[data-action="delete-user"]'
            );

            if (deleteButton) {
                const userId = Number(
                    deleteButton.getAttribute('data-id')
                );

                removeUser(
                    userId,
                    deleteButton
                );
            }
        });
    }

    //export report
    const exportReportButton =
        document.getElementById(
            'btnExportAdminReport'
        );

    if (exportReportButton) {
        exportReportButton.addEventListener(
            'click',
            exportAdminReportCSV
        );
    }

    //admin logout
    const logoutLink = document.getElementById(
        'adminLogoutLink'
    );

    if (logoutLink) {
        logoutLink.addEventListener(
            'click',
            async event => {
                event.preventDefault();

                logoutLink.style.pointerEvents = 'none';

                await logoutUser();
            }
        );
    }
});
