import { isAuthenticated, getUser } from './authService.js';
import { deleteEvent, getMyOrganizerEvents, getMyOrganizerRSVPs, getMyOrganizerGroups } from './api.js';
import { showToast } from './main.js';

// Organizer hub and dashboard logic

// Module-scoped delete handler
async function handleDeleteOrganizerEvent(eventId, eventTitle) {
    const cleanTitle = eventTitle || 'this event';
    if (!confirm(`Are you sure you want to delete "${cleanTitle}"? This cannot be undone.`)) {
        return;
    }

    try {
        const res = await deleteEvent(eventId);
        if (res && res.success) {
            showToast('Event deleted successfully.', 'success');
            // Re-render dashboard without full page reload
            loadDashboardData();
        } else {
            const msg = res?.message || 'Failed to delete event.';
            showToast(msg, 'error');
        }
    } catch (err) {
        console.error('Error deleting event:', err);
        showToast('Network error while deleting event.', 'error');
    }
}

// Main loader function
async function loadDashboardData() {
    // Guard — Require authentication
    if (!isAuthenticated() && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'login.html?redirect=dashboard.html';
        return;
    }

    // 2. Hydrate user info from session
    const currentUser = getUser() || {};

    const userName = currentUser.name || 'Organizer';
    const userRole = currentUser.role || 'Organizer';

    const groupTitleEl = document.getElementById('dashboardGroupTitle');
    const groupSubtitleEl = document.getElementById('dashboardGroupSubtitle');
    const groupAvatarEl = document.getElementById('dashboardGroupAvatar');
    const roleBadgeEl = document.getElementById('dashboardRoleBadge');

    if (roleBadgeEl) {
        roleBadgeEl.textContent = userRole === 'admin' ? 'Superadmin Organizer' : 'Community Organizer';
    }

    // Check if organizer has an active group in database
    try {
        if (typeof getMyOrganizerGroups === 'function') {
            const grpRes = await getMyOrganizerGroups();
            if (grpRes && grpRes.success && Array.isArray(grpRes.data) && grpRes.data.length > 0) {
                const primaryGroup = grpRes.data[0];
                if (groupTitleEl) groupTitleEl.textContent = primaryGroup.name;
                if (groupSubtitleEl) {
                    const memberCount = primaryGroup.member_count || 0;
                    const city = primaryGroup.city || 'Nepal';
                    groupSubtitleEl.textContent = `${memberCount.toLocaleString()} members • Public Group • ${city}`;
                }
                if (groupAvatarEl && primaryGroup.name) {
                    groupAvatarEl.textContent = primaryGroup.name.slice(0, 1).toUpperCase();
                }
            } else {
                if (groupTitleEl) groupTitleEl.textContent = `${userName}'s Organizer Hub`;
                if (groupSubtitleEl) {
                    groupSubtitleEl.textContent = `Host & manage community events across Nepal • ${currentUser.email || 'Verified Host'}`;
                }
                if (groupAvatarEl) {
                    groupAvatarEl.textContent = userName.slice(0, 1).toUpperCase();
                }
            }
        }
    } catch (e) {
        console.log('Could not load organizer group info:', e);
        if (groupTitleEl) groupTitleEl.textContent = `${userName}'s Organizer Hub`;
    }

    // 3. Fetch organizer events and compute statistics
    let events = [];
    let stats = { totalEvents: 0, totalRSVPs: 0, grossVolume: 0 };

    try {
        if (typeof getMyOrganizerEvents === 'function') {
            const evRes = await getMyOrganizerEvents();
            if (evRes && evRes.success && Array.isArray(evRes.data)) {
                events = evRes.data;
                if (evRes.stats) {
                    stats = evRes.stats;
                }
            }
        }
    } catch (e) {
        console.log('Error fetching organizer events:', e);
    }

    // 4. Update Quick Stats Overview
    const statEventsEl = document.getElementById('statUpcomingEvents');
    const statMembersEl = document.getElementById('statGroupMembers');
    const statRSVPsEl = document.getElementById('statTotalRSVPs');
    const statSalesEl = document.getElementById('statGrossSales');
    const countBadgeEl = document.getElementById('dashboardEventsCountBadge');

    if (statEventsEl) statEventsEl.textContent = stats.totalEvents;
    if (statRSVPsEl) statRSVPsEl.textContent = stats.totalRSVPs.toLocaleString();
    if (statSalesEl) {
        statSalesEl.textContent = stats.grossVolume === 0
            ? 'Free Events'
            : `NPR ${stats.grossVolume.toLocaleString()}`;
    }
    if (statMembersEl) {
        const reach = stats.totalRSVPs;
        statMembersEl.textContent = reach.toLocaleString();
    }
    if (countBadgeEl) {
        countBadgeEl.textContent = events.length;
    }

    // Link "Manage Attendees & Gate" header button to first event if available
    const btnHubManageGate = document.getElementById('btnHubManageGate');
    if (btnHubManageGate && events.length > 0) {
        btnHubManageGate.href = `manage-event.html?id=${events[0].id}`;
    }

    // 5. Render Scheduled Meetups List
    const eventsListContainer = document.getElementById('dashboardUpcomingEventsList');
    if (eventsListContainer) {
        if (events.length === 0) {
            eventsListContainer.innerHTML = `
                <div class="dash-empty-box">
                    <span class="material-symbols-outlined dash-empty-icon">event_busy</span>
                    <h3 class="dash-empty-title">No upcoming meetups scheduled</h3>
                    <p class="dash-empty-desc">
                        You haven't scheduled any meetups yet. Host a gathering, workshop, or tech talk to start building your community.
                    </p>
                    <a href="create-event.html" class="btn btn-teal btn-pill btn-sm">+ Schedule Your First Meetup</a>
                </div>
            `;
        } else {
            eventsListContainer.innerHTML = events.map((ev, idx) => {
                const isLast = idx === events.length - 1;
                const dateStr = ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                }).toUpperCase() : 'DATE TBD';
                const timeStr = ev.start_time ? ev.start_time.slice(0, 5) : '10:00';
                const isFree = ev.is_free || !ev.min_price || Number(ev.min_price) === 0;
                const priceLabel = isFree ? 'Free' : `NPR ${Number(ev.min_price).toLocaleString()}`;
                const borderClass = isLast ? '' : 'dash-event-item-border';
                const escapedTitle = (ev.title || '').replace(/'/g, "\\'");
                const onlineBadge = ev.is_online ? '<span class="badge badge-online-light">Online</span>' : '';

                return `
                    <div class="dash-event-item ${borderClass}">
                        <div class="dash-event-info">
                            <div class="dash-event-meta">
                                <span>${dateStr} · ${timeStr} NPT</span>
                                ${onlineBadge}
                            </div>
                            <h3 class="dash-event-title">
                                ${ev.title}
                            </h3>
                            <div class="dash-event-sub">
                                ${ev.venue || ev.city || 'Location TBD'} • <strong>${ev.attendee_count || 0} Going</strong> • ${priceLabel}
                            </div>
                        </div>
                        <div class="dash-event-actions">
                            <a href="manage-event.html?id=${ev.id}" class="btn btn-outline-teal btn-pill btn-sm">
                                <span class="material-symbols-outlined">qr_code_scanner</span>
                                <span>Manage RSVPs</span>
                            </a>
                            <a href="event-details.html?id=${ev.id}" target="_blank" class="btn btn-outline btn-pill btn-sm" title="Preview public page">
                                Preview
                            </a>
                            <button type="button" class="btn btn-sm btn-pill btn-danger-light" data-action="delete-event" data-id="${ev.id}" data-title="${escapedTitle}" title="Delete event">
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            if (!eventsListContainer.dataset.bound) {
                eventsListContainer.dataset.bound = 'true';
                eventsListContainer.addEventListener('click', (e) => {
                    const btn = e.target.closest('[data-action="delete-event"]');
                    if (btn) {
                        const eventId = btn.getAttribute('data-id');
                        const eventTitle = btn.getAttribute('data-title');
                        handleDeleteOrganizerEvent(eventId, eventTitle);
                    }
                });
            }
        }
    }

    // 6. Fetch and Render Recent RSVPs
    const rsvpsBody = document.getElementById('dashboardRecentRSVPsBody');
    if (rsvpsBody) {
        let rsvps = [];
        try {
            if (typeof getMyOrganizerRSVPs === 'function') {
                const rsvpRes = await getMyOrganizerRSVPs();
                if (rsvpRes && rsvpRes.success && Array.isArray(rsvpRes.data)) {
                    rsvps = rsvpRes.data;
                }
            }
        } catch (e) {
            console.log('Error fetching recent RSVPs:', e);
        }

        if (rsvps.length === 0) {
            rsvpsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="dash-table-empty">
                        No RSVPs received yet. As community members register for your meetups, their details and check-in statuses will appear here.
                    </td>
                </tr>
            `;
        } else {
            rsvpsBody.innerHTML = rsvps.map(r => {
                const isCheckedIn = r.status === 'checked_in';
                const badgeClass = isCheckedIn ? 'badge-status-checked' : 'badge-status-confirmed';
                const statusLabel = isCheckedIn ? 'Checked In' : 'Going';
                const formattedId = `RSVP-${String(r.id).padStart(4, '0')}`;

                return `
                    <tr>
                        <td>
                            <div class="dash-user-name">${r.user_name || 'Community Member'}</div>
                            <div class="dash-user-sub">${r.user_email || '—'}</div>
                        </td>
                        <td>
                            <div class="dash-rsvp-event">${r.event_title || 'Meetup'}</div>
                        </td>
                        <td>
                            <span class="dash-mono-id">${formattedId}</span>
                        </td>
                        <td>
                            <span class="badge ${badgeClass}">${statusLabel}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', loadDashboardData);
