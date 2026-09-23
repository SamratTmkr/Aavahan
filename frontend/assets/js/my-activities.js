import { isAuthenticated } from './authService.js';
import { getMyActivities, getMyOrganizerEvents, cancelEventRsvp } from './api.js';
import { showToast, escapeHtml } from './main.js';

// My Activities & Created Events page logic

let joinedData = { upcoming: [], past: [], all: [] };
let createdData = { upcoming: [], past: [], all: [], stats: {} };
let currentTab = 'joined'; // 'joined' | 'created'
let currentSubFilter = 'upcoming'; // 'upcoming' | 'past' | 'all'
let searchQuery = '';

// Helper: Check authentication
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html?redirect=my-activities.html';
        return false;
    }
    return true;
}

// Check if an event date is today or in the future
function isUpcomingDate(dateStr) {
    if (!dateStr) return false;
    const evDate = new Date(dateStr);
    evDate.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return evDate >= now;
}

// Fetch both joined activities and created events
async function loadActivities() {
    if (!requireAuth()) return;

    const listEl = document.getElementById('activitiesList');
    if (listEl) {
        listEl.innerHTML = `
            <div class="loading-skeleton-center">
                <div class="skeleton-loader skeleton-circle-lg"></div>
                <div class="skeleton-loader skeleton-bar-md"></div>
                <div class="skeleton-loader skeleton-bar-sm"></div>
            </div>
        `;
    }

    try {
        const [joinedRes, createdRes] = await Promise.all([
            getMyActivities(),
            getMyOrganizerEvents()
        ]);

        // 1. Process Joined Events
        if (joinedRes && joinedRes.success && joinedRes.data) {
            const up = joinedRes.data.upcoming || [];
            const pst = joinedRes.data.past || [];
            joinedData = {
                upcoming: up,
                past: pst,
                all: [...up, ...pst].sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
            };
        } else {
            joinedData = { upcoming: [], past: [], all: [] };
        }

        // 2. Process Created Events
        if (createdRes && createdRes.success && Array.isArray(createdRes.data)) {
            const raw = createdRes.data;
            const up = [];
            const pst = [];

            raw.forEach(ev => {
                if (isUpcomingDate(ev.event_date)) {
                    up.push(ev);
                } else {
                    pst.push(ev);
                }
            });

            up.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
            pst.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

            createdData = {
                upcoming: up,
                past: pst,
                all: raw,
                stats: createdRes.stats || { totalEvents: raw.length, totalRSVPs: 0 }
            };
        } else {
            createdData = { upcoming: [], past: [], all: [], stats: { totalEvents: 0, totalRSVPs: 0 } };
        }

        updateStatsAndBadges();
        renderSubfilters();
        renderList();
    } catch (err) {
        console.error('Error loading activities:', err);
        showToast('Failed to load your activities.', 'error');
    }
}

// Update KPI summary cards and tab badges
function updateStatsAndBadges() {
    // Joined stats
    const joinedTotal = joinedData.all.length;
    const joinedUp = joinedData.upcoming.length;
    const joinedPst = joinedData.past.length;

    const statJoinedTotal = document.getElementById('statJoinedTotal');
    const statJoinedUpcoming = document.getElementById('statJoinedUpcoming');
    const statJoinedPast = document.getElementById('statJoinedPast');
    const badgeJoinedTotal = document.getElementById('badgeJoinedTotal');

    if (statJoinedTotal) statJoinedTotal.textContent = joinedTotal;
    if (statJoinedUpcoming) statJoinedUpcoming.textContent = joinedUp;
    if (statJoinedPast) statJoinedPast.textContent = joinedPst;
    if (badgeJoinedTotal) badgeJoinedTotal.textContent = joinedTotal;

    // Created stats
    const createdTotal = createdData.all.length;
    const createdUp = createdData.upcoming.length;
    const createdPst = createdData.past.length;
    const totalRSVPs = createdData.stats?.totalRSVPs || createdData.all.reduce((sum, e) => sum + (e.attendee_count || 0), 0);

    const statCreatedTotal = document.getElementById('statCreatedTotal');
    const statCreatedUpcoming = document.getElementById('statCreatedUpcoming');
    const statCreatedPast = document.getElementById('statCreatedPast');
    const badgeCreatedTotal = document.getElementById('badgeCreatedTotal');
    const statTotalAttendees = document.getElementById('statTotalAttendees');

    if (statCreatedTotal) statCreatedTotal.textContent = createdTotal;
    if (statCreatedUpcoming) statCreatedUpcoming.textContent = createdUp;
    if (statCreatedPast) statCreatedPast.textContent = createdPst;
    if (badgeCreatedTotal) badgeCreatedTotal.textContent = createdTotal;
    if (statTotalAttendees) statTotalAttendees.textContent = totalRSVPs.toLocaleString();
}

// Render dynamic subfilter pill buttons
function renderSubfilters() {
    const container = document.getElementById('subfilterContainer');
    if (!container) return;

    if (currentTab === 'joined') {
        container.innerHTML = `
            <button type="button" class="activities-filter-pill ${currentSubFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming">
                <span>Upcoming</span>
                <span class="pill-count">${joinedData.upcoming.length}</span>
            </button>
            <button type="button" class="activities-filter-pill ${currentSubFilter === 'past' ? 'active' : ''}" data-filter="past">
                <span>Past Events</span>
                <span class="pill-count">${joinedData.past.length}</span>
            </button>
            <button type="button" class="activities-filter-pill ${currentSubFilter === 'all' ? 'active' : ''}" data-filter="all">
                <span>All Joined</span>
                <span class="pill-count">${joinedData.all.length}</span>
            </button>
        `;
    } else {
        container.innerHTML = `
            <button type="button" class="activities-filter-pill ${currentSubFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming">
                <span>Active & Upcoming</span>
                <span class="pill-count">${createdData.upcoming.length}</span>
            </button>
            <button type="button" class="activities-filter-pill ${currentSubFilter === 'past' ? 'active' : ''}" data-filter="past">
                <span>Past Hosted</span>
                <span class="pill-count">${createdData.past.length}</span>
            </button>
            <button type="button" class="activities-filter-pill ${currentSubFilter === 'all' ? 'active' : ''}" data-filter="all">
                <span>All Created</span>
                <span class="pill-count">${createdData.all.length}</span>
            </button>
        `;
    }

    container.querySelectorAll('.activities-filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            currentSubFilter = btn.getAttribute('data-filter');
            container.querySelectorAll('.activities-filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderList();
        });
    });
}

// Render the active items list
function renderList() {
    const listEl = document.getElementById('activitiesList');
    if (!listEl) return;

    if (currentTab === 'joined') {
        renderJoinedList(listEl);
    } else {
        renderCreatedList(listEl);
    }
}

// Render "Events I've Joined"
function renderJoinedList(listEl) {
    let items = [];
    if (currentSubFilter === 'upcoming') items = joinedData.upcoming;
    else if (currentSubFilter === 'past') items = joinedData.past;
    else items = joinedData.all;

    // Apply search query filter if typed
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        items = items.filter(e => 
            (e.title && e.title.toLowerCase().includes(q)) ||
            (e.venue && e.venue.toLowerCase().includes(q)) ||
            (e.city && e.city.toLowerCase().includes(q)) ||
            (e.category && e.category.toLowerCase().includes(q)) ||
            (e.group_name && e.group_name.toLowerCase().includes(q))
        );
    }

    if (!items || items.length === 0) {
        let emptyDesc = "You haven't joined any events in this section yet. Discover meetups, workshops, and gatherings happening across Nepal!";
        if (searchQuery.trim()) {
            emptyDesc = `No joined events matching "${escapeHtml(searchQuery)}". Try a different keyword.`;
        }
        listEl.innerHTML = `
            <div class="activities-empty">
                <span class="material-symbols-outlined activities-empty-icon">confirmation_number</span>
                <h3 class="activities-empty-title">No joined events found</h3>
                <p class="activities-empty-desc">${emptyDesc}</p>
                <a href="explore.html" class="btn btn-primary btn-pill">Find Events to Join</a>
            </div>
        `;
        return;
    }

    listEl.innerHTML = items.map(ev => {
        const d = ev.event_date ? new Date(ev.event_date) : new Date();
        const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
        const dayStr = d.getDate();
        const dateFormatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const timeFormatted = ev.start_time ? ev.start_time.slice(0, 5) + ' NPT' : 'Time TBD';

        const isFree = ev.is_free || !ev.min_price || Number(ev.min_price) === 0;
        const priceLabel = isFree ? 'Free' : `NPR ${Number(ev.min_price).toLocaleString()}`;
        const ticketCode = ev.checkin_code || '';

        // Exact location representation
        let locationMarkup = '';
        if (ev.is_online) {
            locationMarkup = `
                <div class="activity-location-highlight">
                    <span class="material-symbols-outlined activity-location-icon online">videocam</span>
                    <span><strong>Online Event:</strong> Zoom / Google Meet · Join link provided to attendees</span>
                </div>
            `;
        } else {
            const locParts = [ev.venue, ev.address, ev.city, 'Nepal'].filter(Boolean);
            const fullLoc = locParts.length > 0 ? locParts.join(', ') : 'Location to be announced';
            locationMarkup = `
                <div class="activity-location-highlight">
                    <span class="material-symbols-outlined activity-location-icon">location_on</span>
                    <span><strong>Where:</strong> ${fullLoc}</span>
                </div>
            `;
        }

        const isCheckedIn = ev.rsvp_status === 'checked_in';
        const badgeClass = isCheckedIn ? 'badge-status-checked' : 'badge-status-confirmed';
        const statusLabel = isCheckedIn ? 'Checked In' : 'Confirmed RSVP';

        const isUpcoming = isUpcomingDate(ev.event_date);
        const escapedTitle = escapeHtml(ev.title || '').replace(/'/g, "\\'");

        const cancelButton = isUpcoming ? `
            <button type="button" class="btn btn-sm btn-pill btn-cancel-rsvp" data-action="cancel-rsvp" data-id="${ev.event_id}" data-title="${escapedTitle}">
                Cancel RSVP
            </button>
        ` : '';

        const groupTag = ev.group_name ? `<span>•</span><span>by <strong>${escapeHtml(ev.group_name)}</strong></span>` : '';

        return `
            <div class="activity-card">
                <div class="activity-card-left">
                    <div class="activity-date-badge">
                        <span class="activity-date-month">${monthStr}</span>
                        <span class="activity-date-day">${dayStr}</span>
                    </div>
                    <div class="activity-details">
                        <div class="activity-meta">
                            <span>📅 ${dateFormatted} · ${timeFormatted}</span>
                            <span>•</span>
                            <span class="activity-category-pill">${ev.category || 'Event'}</span>
                            ${groupTag}
                        </div>
                        <a href="event-details.html?id=${ev.event_id}" class="activity-title">
                            ${escapeHtml(ev.title)}
                        </a>
                        ${locationMarkup}
                        <div class="activity-sub">
                            <span>🎟️ ${priceLabel}</span>
                            <span>•</span>
                            <span>🔖 Ticket Code: <strong class="dash-mono-id">${escapeHtml(ticketCode) || 'n/a'}</strong></span>
                        </div>
                    </div>
                </div>
                <div class="activity-card-right">
                    <span class="badge ${badgeClass}">${statusLabel}</span>
                    <a href="event-details.html?id=${ev.event_id}" class="btn btn-outline btn-pill btn-sm">
                        View Event
                    </a>
                    ${cancelButton}
                </div>
                ${ticketCode ? `
                <div class="activity-ticket">
                    <button type="button" class="btn btn-outline btn-pill btn-sm"
                            data-action="show-ticket" data-code="${escapeHtml(ticketCode)}" data-rsvp="${ev.rsvp_id}">
                        Show ticket QR
                    </button>
                    <div class="ticket-qr-wrap" id="ticketQr-${ev.rsvp_id}" hidden></div>
                </div>` : ''}
            </div>
        `;
    }).join('');
}

// Draws the ticket QR the first time it is asked for. The QR encodes a link to
// the check-in page, so an organiser can scan it with an ordinary phone camera
// and does not need a scanner built into the site.
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="show-ticket"]');
    if (!btn) return;

    const wrap = document.getElementById(`ticketQr-${btn.dataset.rsvp}`);
    if (!wrap) return;

    if (!wrap.hidden) {
        wrap.hidden = true;
        btn.textContent = 'Show ticket QR';
        return;
    }

    if (!wrap.dataset.drawn) {
        const url = `${window.location.origin}/pages/checkin.html?code=${btn.dataset.code}`;
        if (typeof QRCode === 'undefined') {
            wrap.innerHTML = `<p class="activity-ticket-note">Show this code at the door: <strong>${escapeHtml(btn.dataset.code)}</strong></p>`;
        } else {
            new QRCode(wrap, { text: url, width: 160, height: 160 });
            const note = document.createElement('p');
            note.className = 'activity-ticket-note';
            note.textContent = `Code: ${btn.dataset.code}`;
            wrap.appendChild(note);
        }
        wrap.dataset.drawn = 'yes';
    }

    wrap.hidden = false;
    btn.textContent = 'Hide ticket QR';
});

// Render "Events I've Created"
function renderCreatedList(listEl) {
    let items = [];
    if (currentSubFilter === 'upcoming') items = createdData.upcoming;
    else if (currentSubFilter === 'past') items = createdData.past;
    else items = createdData.all;

    // Apply search query filter if typed
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        items = items.filter(e => 
            (e.title && e.title.toLowerCase().includes(q)) ||
            (e.venue && e.venue.toLowerCase().includes(q)) ||
            (e.city && e.city.toLowerCase().includes(q)) ||
            (e.category && e.category.toLowerCase().includes(q)) ||
            (e.group_name && e.group_name.toLowerCase().includes(q))
        );
    }

    if (!items || items.length === 0) {
        let emptyDesc = "You haven't hosted any events matching this section yet. Gather like-minded people by organizing a meetup or workshop!";
        if (searchQuery.trim()) {
            emptyDesc = `No created events matching "${escapeHtml(searchQuery)}". Try a different keyword.`;
        }
        listEl.innerHTML = `
            <div class="activities-empty">
                <span class="material-symbols-outlined activities-empty-icon">campaign</span>
                <h3 class="activities-empty-title">No created events found</h3>
                <p class="activities-empty-desc">${emptyDesc}</p>
                <a href="create-event.html" class="btn btn-primary btn-pill">+ Host Your First Event</a>
            </div>
        `;
        return;
    }

    listEl.innerHTML = items.map(ev => {
        const d = ev.event_date ? new Date(ev.event_date) : new Date();
        const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
        const dayStr = d.getDate();
        const dateFormatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const timeFormatted = ev.start_time ? ev.start_time.slice(0, 5) + ' NPT' : 'Time TBD';

        const isUpcoming = isUpcomingDate(ev.event_date);
        const statusBadge = isUpcoming 
            ? `<span class="badge badge-status-active"><span class="material-symbols-outlined icon-badge-inline">check_circle</span> Active & Upcoming</span>`
            : `<span class="badge badge-status-past"><span class="material-symbols-outlined icon-badge-inline">history</span> Past Hosted</span>`;

        const isFree = ev.is_free || !ev.min_price || Number(ev.min_price) === 0;
        const priceLabel = isFree ? 'Free Event' : `NPR ${Number(ev.min_price).toLocaleString()}`;
        const attendeesCount = ev.attendee_count || 0;
        const capacityText = ev.capacity ? `${attendeesCount} / ${ev.capacity} Seats Filled` : `${attendeesCount} Registered Attendees`;

        // Exact location representation
        let locationMarkup = '';
        if (ev.is_online) {
            locationMarkup = `
                <div class="activity-location-highlight">
                    <span class="material-symbols-outlined activity-location-icon online">videocam</span>
                    <span><strong>Online Event:</strong> Virtual Meeting Platform (Zoom / Meet)</span>
                </div>
            `;
        } else {
            const locParts = [ev.venue, ev.address, ev.city, 'Nepal'].filter(Boolean);
            const fullLoc = locParts.length > 0 ? locParts.join(', ') : 'Venue to be announced';
            locationMarkup = `
                <div class="activity-location-highlight">
                    <span class="material-symbols-outlined activity-location-icon">location_on</span>
                    <span><strong>Where:</strong> ${fullLoc}</span>
                </div>
            `;
        }

        const groupTag = ev.group_name ? `<span>•</span><span>Community: <strong>${escapeHtml(ev.group_name)}</strong></span>` : '';

        return `
            <div class="activity-card activity-card-created">
                <div class="activity-card-left">
                    <div class="activity-date-badge">
                        <span class="activity-date-month">${monthStr}</span>
                        <span class="activity-date-day">${dayStr}</span>
                    </div>
                    <div class="activity-details">
                        <div class="activity-meta">
                            <span>📅 ${dateFormatted} · ${timeFormatted}</span>
                            <span>•</span>
                            <span class="activity-category-pill">${ev.category || 'Event'}</span>
                            ${groupTag}
                        </div>
                        <a href="event-details.html?id=${ev.id}" class="activity-title">
                            ${escapeHtml(ev.title)}
                        </a>
                        ${locationMarkup}
                        <div class="activity-sub">
                            <span>👥 <strong>${capacityText}</strong></span>
                            <span>•</span>
                            <span>🎟️ ${priceLabel}</span>
                        </div>
                    </div>
                </div>
                <div class="activity-card-right">
                    ${statusBadge}
                    <a href="manage-event.html?id=${ev.id}" class="btn btn-primary btn-pill btn-sm">
                        <span class="material-symbols-outlined icon-btn-inline">tune</span>
                        Manage Event
                    </a>
                    <a href="event-details.html?id=${ev.id}" class="btn btn-outline btn-pill btn-sm">
                        Public Page
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Cancel RSVP handler
async function handleCancelActivityRsvp(eventId, eventTitle) {
    const title = eventTitle || 'this event';
    if (!confirm(`Are you sure you want to cancel your registration for "${title}"?`)) {
        return;
    }

    try {
        const res = await cancelEventRsvp(eventId);
        if (res && res.success) {
            showToast('Registration cancelled successfully.', 'success');
            loadActivities();
        } else {
            const msg = res?.message || 'Failed to cancel registration.';
            showToast(msg, 'error');
        }
    } catch (err) {
        console.error('Error cancelling RSVP:', err);
        showToast('Error cancelling registration.', 'error');
    }
}

// Wire up events
document.addEventListener('DOMContentLoaded', () => {
    const tabJoined = document.getElementById('tabJoined');
    const tabCreated = document.getElementById('tabCreated');
    const searchInput = document.getElementById('activitySearchInput');
    const listEl = document.getElementById('activitiesList');

    if (tabJoined && tabCreated) {
        tabJoined.addEventListener('click', () => {
            currentTab = 'joined';
            currentSubFilter = 'upcoming';
            tabJoined.classList.add('active');
            tabCreated.classList.remove('active');
            renderSubfilters();
            renderList();
        });

        tabCreated.addEventListener('click', () => {
            currentTab = 'created';
            currentSubFilter = 'upcoming';
            tabCreated.classList.add('active');
            tabJoined.classList.remove('active');
            renderSubfilters();
            renderList();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderList();
        });
    }

    if (listEl) {
        listEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="cancel-rsvp"]');
            if (btn) {
                const eventId = btn.getAttribute('data-id');
                const eventTitle = btn.getAttribute('data-title');
                handleCancelActivityRsvp(eventId, eventTitle);
            }
        });
    }

    loadActivities();
});
