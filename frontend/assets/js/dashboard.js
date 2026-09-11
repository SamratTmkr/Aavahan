// ============================================================
// Organizer Hub / Dashboard Logic — dashboard.js
// ============================================================

// Global delete handler exposed to window for inline button clicks
window.handleDeleteOrganizerEvent = async function(eventId, eventTitle) {
    const cleanTitle = eventTitle || 'this event';
    if (!confirm(`Are you sure you want to delete "${cleanTitle}"? This cannot be undone.`)) {
        return;
    }

    try {
        if (typeof showToast === 'function') {
            showToast('Removing event...', 'info');
        }

        const res = await deleteEvent(eventId);
        if (res && res.success) {
            if (typeof showToast === 'function') {
                showToast('Event deleted successfully.', 'success');
            } else {
                alert('Event deleted successfully.');
            }
            // Re-render dashboard without full page reload
            loadDashboardData();
        } else {
            const msg = res?.message || 'Failed to delete event.';
            if (typeof showToast === 'function') {
                showToast(msg, 'error');
            } else {
                alert(msg);
            }
        }
    } catch (err) {
        console.error('Error deleting event:', err);
        if (typeof showToast === 'function') {
            showToast('Network error while deleting event.', 'error');
        }
    }
};

// Main loader function
async function loadDashboardData() {
    // 1. Check for demo flag in URL to facilitate direct preview
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === '1' || urlParams.get('demo') === 'true') {
        if (!localStorage.getItem('aavahan_token')) {
            const demoUser = { id: 1, name: 'Aarav Sharma', email: 'aarav.sharma@example.com', role: 'user' };
            localStorage.setItem('aavahan_token', 'demo-organizer-token');
            localStorage.setItem('aavahan_user', JSON.stringify(demoUser));
        }
    }

    // Guard — Require authentication
    const token = localStorage.getItem('aavahan_token') || sessionStorage.getItem('aavahan_token');
    if (!token && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'login.html?redirect=dashboard.html';
        return;
    }

    // 2. Hydrate user info from session
    let currentUser = {};
    try {
        currentUser = JSON.parse(localStorage.getItem('aavahan_user') || '{}');
    } catch (e) {}

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
                    const city = primaryGroup.city || 'Kathmandu, Nepal';
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
        console.warn('Could not load organizer group info:', e);
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
        console.warn('Error fetching organizer events:', e);
    }

    // Fallback: If in demo mode without DB events, provide a helpful demo set so user can preview UI
    const isDemoMode = !token || (token && token.startsWith('demo-')) || isDemoParam;
    if (events.length === 0 && isDemoMode) {
        events = [
            {
                id: 'evt-001',
                title: 'Kathmandu Tech Summit 2026: AI & Microservices',
                event_date: '2026-09-12',
                start_time: '09:30:00',
                venue: 'Heritage Convention Hall, Durbar Marg',
                city: 'Kathmandu',
                is_free: false,
                min_price: 1500,
                attendee_count: 142
            },
            {
                id: 'evt-002',
                title: 'Community Open Source & Python AI Hacknight',
                event_date: '2026-10-16',
                start_time: '18:00:00',
                venue: 'DevSpace Hub, Baneshwor',
                city: 'Kathmandu',
                is_free: true,
                min_price: 0,
                attendee_count: 52
            }
        ];
        stats = {
            totalEvents: events.length,
            totalRSVPs: 194,
            grossVolume: 213000
        };
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
        // Estimate community reach as RSVPs + base
        const reach = Math.max(stats.totalRSVPs, events.length > 0 ? stats.totalRSVPs + 45 : 0);
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
                <div style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted); background: var(--bg-subtle); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: var(--border-color); margin-bottom: 0.75rem; display: block;">event_busy</span>
                    <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.4rem;">No upcoming meetups scheduled</h3>
                    <p style="margin-bottom: 1.5rem; max-width: 420px; margin-left: auto; margin-right: auto; font-size: 0.88rem;">
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
                const borderStyle = isLast ? '' : 'border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;';
                const escapedTitle = (ev.title || '').replace(/'/g, "\\'");
                const onlineBadge = ev.is_online ? '<span class="badge" style="background:#e0f2fe;color:#0284c7;font-size:0.7rem;font-weight:700;padding:2px 6px;">Online</span>' : '';

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; ${borderStyle} flex-wrap: wrap; gap: 1rem;">
                        <div style="flex: 1; min-width: 260px;">
                            <div style="font-size: 0.8rem; font-weight: 700; color: #8c5300; display: flex; align-items: center; gap: 0.5rem;">
                                <span>${dateStr} · ${timeStr} NPT</span>
                                ${onlineBadge}
                            </div>
                            <h3 style="font-size: 1.15rem; font-weight: 700; margin-top: 0.25rem; margin-bottom: 0.25rem; color: var(--text-primary);">
                                ${ev.title}
                            </h3>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">
                                ${ev.venue || ev.city || 'Kathmandu, Nepal'} • <strong>${ev.attendee_count || 0} Going</strong> • ${priceLabel}
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
                            <a href="manage-event.html?id=${ev.id}" class="btn btn-outline-teal btn-pill btn-sm">
                                <span class="material-symbols-outlined" style="font-size: 16px;">qr_code_scanner</span>
                                <span>Manage RSVPs</span>
                            </a>
                            <a href="event-details.html?id=${ev.id}" target="_blank" class="btn btn-outline btn-pill btn-sm" title="Preview public page">
                                Preview
                            </a>
                            <button type="button" class="btn btn-sm btn-pill" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:0.35rem 0.75rem;cursor:pointer;" onclick="handleDeleteOrganizerEvent(${ev.id}, '${escapedTitle}')" title="Delete event">
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
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
            console.warn('Error fetching recent RSVPs:', e);
        }

        if (rsvps.length === 0 && isDemoMode) {
            rsvps = [
                { id: 1042, user_name: 'Pooja Manandhar', user_email: 'pooja.m@example.com', event_title: 'Kathmandu Tech Summit 2026', status: 'checked_in' },
                { id: 1043, user_name: 'Roshan Adhikari', user_email: 'roshan.a@example.com', event_title: 'Kathmandu Tech Summit 2026', status: 'confirmed' },
                { id: 1044, user_name: 'Anjali Karki', user_email: 'anjali.k@example.com', event_title: 'Community Open Source & Python AI Hacknight', status: 'confirmed' }
            ];
        }

        if (rsvps.length === 0) {
            rsvpsBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.9rem;">
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
                            <div style="font-weight: 700; color: var(--text-primary);">${r.user_name || 'Community Member'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${r.user_email || '—'}</div>
                        </td>
                        <td>
                            <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">${r.event_title || 'Meetup'}</div>
                        </td>
                        <td>
                            <span style="font-family: monospace; font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">${formattedId}</span>
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
