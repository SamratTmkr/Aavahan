// ============================================================
// Manage Event Logic — manage-event.js
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Guard
    const token = localStorage.getItem('aavahan_token') || sessionStorage.getItem('aavahan_token');
    if (!token) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }

    // 2. Parse Event ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        if (typeof showToast === 'function') showToast('No event ID provided.', 'error');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
        return;
    }

    // Tab switching
    const tabItems = document.querySelectorAll('.manage-tab-item');
    const tabPanes = document.querySelectorAll('.manage-tab-pane');
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            tabItems.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.style.display = 'none');
            item.classList.add('active');
            const targetId = item.getAttribute('data-tab-target');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.style.display = 'block';
        });
    });

    let currentEvent = null;
    let attendeesList = [];

    // 3. Fetch Event Details
    try {
        const evRes = await getEvent(eventId);
        if (evRes && evRes.success && evRes.data) {
            currentEvent = evRes.data;
        } else {
            document.querySelector('main').innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: var(--border-color); margin-bottom: 0.5rem; display: block;">event_busy</span>
                    <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Event Not Found</h2>
                    <p style="margin-bottom: 1.5rem;">This event may have been deleted or does not exist.</p>
                    <a href="dashboard.html" class="btn btn-primary btn-pill">Return to Organizer Hub</a>
                </div>
            `;
            return;
        }
    } catch (err) {
        console.error('Error loading event:', err);
        return;
    }

    // Hydrate Header
    document.title = `Manage — ${currentEvent.title} | Aavahan`;
    const headerTitleEl = document.getElementById('manageEventTitle');
    const headerDateEl = document.getElementById('manageEventDate');
    const headerIdBadgeEl = document.getElementById('manageEventIdBadge');
    const viewPublicBtn = document.getElementById('btnViewPublicPage');
    const editEventBtn = document.getElementById('btnEditEvent');

    if (headerTitleEl) headerTitleEl.textContent = currentEvent.title;
    if (headerIdBadgeEl) headerIdBadgeEl.textContent = `Event #${currentEvent.id}`;

    const eventDate = currentEvent.event_date ? new Date(currentEvent.event_date) : new Date();
    const dateFormatted = eventDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
    });
    const timeFormatted = currentEvent.start_time ? currentEvent.start_time.slice(0, 5) + ' NPT' : '10:00 NPT';
    const venueText = currentEvent.is_online ? 'Online Event' : (currentEvent.venue || currentEvent.city || 'Kathmandu, Nepal');

    if (headerDateEl) {
        headerDateEl.textContent = `${dateFormatted} • ${timeFormatted} • ${venueText}`;
    }

    if (viewPublicBtn) {
        viewPublicBtn.href = `event-details.html?id=${currentEvent.id}`;
    }

    // 4. Fetch Real Attendees
    await loadAttendees();

    async function loadAttendees() {
        try {
            const attRes = await getEventAttendees(eventId);
            if (attRes && attRes.success && Array.isArray(attRes.data)) {
                attendeesList = attRes.data;
            } else {
                attendeesList = [];
            }
        } catch (err) {
            console.warn('Error fetching event attendees:', err);
            attendeesList = [];
        }

        renderMetrics();
        renderAttendeesTable(attendeesList);
    }

    // 5. Render Metrics Cards
    function renderMetrics() {
        const totalRegistrations = attendeesList.length;
        const capacity = currentEvent.capacity || 0;
        const checkedInCount = attendeesList.filter(a => a.status === 'checked_in').length;
        const isFree = currentEvent.is_free || !currentEvent.min_price || Number(currentEvent.min_price) === 0;
        const ticketPrice = isFree ? 0 : Number(currentEvent.min_price);
        const grossSales = totalRegistrations * ticketPrice;

        const metricRegEl = document.getElementById('metricTotalRegistrations');
        const metricSalesEl = document.getElementById('metricGrossSales');
        const metricCheckinEl = document.getElementById('metricCheckedIn');
        const metricTrendRegEl = document.getElementById('metricTrendReg');
        const metricTrendCheckinEl = document.getElementById('metricTrendCheckin');

        if (metricRegEl) {
            metricRegEl.textContent = capacity > 0 ? `${totalRegistrations} / ${capacity}` : `${totalRegistrations}`;
        }
        if (metricTrendRegEl && capacity > 0) {
            const pct = Math.min(100, Math.round((totalRegistrations / capacity) * 100));
            metricTrendRegEl.textContent = `${pct}% Capacity`;
        } else if (metricTrendRegEl) {
            metricTrendRegEl.textContent = `Open capacity`;
        }

        if (metricSalesEl) {
            metricSalesEl.textContent = isFree ? 'Free Event' : `NPR ${grossSales.toLocaleString()}`;
        }

        if (metricCheckinEl) {
            metricCheckinEl.textContent = `${checkedInCount} / ${totalRegistrations}`;
        }
        if (metricTrendCheckinEl) {
            const checkinPct = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;
            metricTrendCheckinEl.textContent = `${checkinPct}% Checked In`;
        }

        const totalCountLabel = document.getElementById('attendeeTotalCount');
        if (totalCountLabel) {
            totalCountLabel.textContent = `${totalRegistrations} attendee${totalRegistrations === 1 ? '' : 's'}`;
        }
    }

    // 6. Render Attendees Table
    function renderAttendeesTable(attendees) {
        const tbody = document.getElementById('attendeesTableBody');
        if (!tbody) return;

        if (attendees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.95rem;">
                        <span class="material-symbols-outlined" style="font-size: 36px; display: block; margin-bottom: 0.5rem; color: var(--border-color);">group_off</span>
                        No attendees registered yet for this event.
                    </td>
                </tr>
            `;
            return;
        }

        const isFree = currentEvent.is_free || !currentEvent.min_price || Number(currentEvent.min_price) === 0;
        const priceLabel = isFree ? 'Free' : `NPR ${Number(currentEvent.min_price).toLocaleString()}`;

        tbody.innerHTML = attendees.map(att => {
            const isCheckedIn = att.status === 'checked_in';
            const badgeClass = isCheckedIn ? 'badge-status-checked' : 'badge-status-confirmed';
            const statusLabel = isCheckedIn ? 'Checked In' : 'Confirmed';
            const rsvpCode = `RSVP-${String(att.id).padStart(4, '0')}`;
            const name = att.name || 'Member';
            const email = att.email || '—';
            const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

            const actionBtn = isCheckedIn
                ? `<span style="font-size: 0.8rem; color: var(--success); font-weight: 600; display: inline-flex; align-items: center; gap: 3px;">
                     <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span> Checked In
                   </span>`
                : `<button type="button" class="btn btn-outline-teal btn-sm" onclick="handleCheckin(${att.id}, this)" style="padding: 0.25rem 0.65rem; font-size: 0.78rem;">
                     <span class="material-symbols-outlined" style="font-size: 14px;">how_to_reg</span> Check In
                   </button>`;

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 34px; height: 34px; border-radius: 50%; background: #00828a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0;">
                                ${initials}
                            </div>
                            <div>
                                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem;">${name}</div>
                                <div style="font-size: 0.78rem; color: var(--text-muted);">${email}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-family: monospace; font-weight: 600; font-size: 0.82rem; color: var(--text-muted);">${rsvpCode}</span>
                    </td>
                    <td>
                        <span style="font-size: 0.85rem; font-weight: 600;">General Admission</span>
                    </td>
                    <td>
                        <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${priceLabel}</span>
                    </td>
                    <td>
                        <span class="badge ${badgeClass}">${statusLabel}</span>
                    </td>
                    <td>
                        ${actionBtn}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 7. Check-in Handler
    window.handleCheckin = async function(rsvpId, btn) {
        btn.disabled = true;
        btn.textContent = 'Processing…';
        try {
            const res = await checkinEventAttendee(currentEvent.id, rsvpId);
            if (res && res.success) {
                if (typeof showToast === 'function') showToast('Attendee checked in successfully!', 'success');
                // Update local attendee record
                const att = attendeesList.find(a => a.id === rsvpId);
                if (att) att.status = 'checked_in';
                renderMetrics();
                applyAttendeeFilters();
            } else {
                if (typeof showToast === 'function') showToast(res?.message || 'Check-in failed.', 'error');
                btn.disabled = false;
                btn.textContent = 'Check In';
            }
        } catch (e) {
            console.error('Check-in error:', e);
            if (typeof showToast === 'function') showToast('Connection error during check-in.', 'error');
            btn.disabled = false;
            btn.textContent = 'Check In';
        }
    };

    // 8. Search and Filter Attendees
    const searchInput = document.getElementById('attendeeSearchInput');
    const statusFilter = document.getElementById('attendeeStatusFilter');

    function applyAttendeeFilters() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const filter = statusFilter ? statusFilter.value.toLowerCase() : 'all';

        const filtered = attendeesList.filter(att => {
            const nameMatch = (att.name || '').toLowerCase().includes(query);
            const emailMatch = (att.email || '').toLowerCase().includes(query);
            const idMatch = String(att.id).includes(query);
            const matchesQuery = !query || nameMatch || emailMatch || idMatch;

            let matchesStatus = true;
            if (filter === 'confirmed') matchesStatus = att.status === 'confirmed';
            else if (filter === 'checked in' || filter === 'checked_in') matchesStatus = att.status === 'checked_in';

            return matchesQuery && matchesStatus;
        });

        renderAttendeesTable(filtered);
    }

    if (searchInput) searchInput.addEventListener('input', applyAttendeeFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyAttendeeFilters);
});
