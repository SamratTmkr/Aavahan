import { isAuthenticated } from './authService.js';
import { 
    getEvent, 
    getEventAttendees, 
    checkinEventAttendee, 
    updateEvent, 
    deleteEvent,
    getEventAnnouncements, 
    createEventAnnouncement, 
    deleteEventAnnouncement, 
    getEventManagers, 
    addEventManager, 
    removeEventManager, 
    addManualAttendee 
} from './api.js';
import { showToast } from './main.js';

// Manage event logic

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Guard
    if (!isAuthenticated()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }

    // 2. Parse Event ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        if (typeof showToast === 'function') showToast('No event ID provided.', 'error');
        setTimeout(() => { window.location.href = 'my-activities.html'; }, 1000);
        return;
    }

    // Tab switching
    const tabItems = document.querySelectorAll('.manage-tab-item');
    const tabPanes = document.querySelectorAll('.manage-tab-pane');
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            tabItems.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-tab-target');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
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
                <div class="dash-empty-box">
                    <span class="material-symbols-outlined dash-empty-icon">event_busy</span>
                    <h2 class="dash-empty-title">Event Not Found</h2>
                    <p class="dash-empty-desc">This event may have been deleted or does not exist.</p>
                    <a href="my-activities.html" class="btn btn-primary btn-pill">Return to My Activities</a>
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
    const venueText = currentEvent.is_online ? 'Online Event' : (currentEvent.venue || currentEvent.city || 'Location TBD');

    if (headerDateEl) {
        headerDateEl.textContent = `${dateFormatted} • ${timeFormatted} • ${venueText}`;
    }

    if (viewPublicBtn) {
        viewPublicBtn.href = `event-details.html?id=${currentEvent.id}`;
    }
    const navBtnViewPublic = document.getElementById('navBtnViewPublic');
    if (navBtnViewPublic) {
        navBtnViewPublic.href = `event-details.html?id=${currentEvent.id}`;
    }

    // 4. Fetch Real Attendees, Announcements, and Team
    await loadAttendees();
    await loadManageAnnouncements();
    await loadManageTeam();

    async function loadAttendees() {
        try {
            const attRes = await getEventAttendees(eventId);
            if (attRes && attRes.success && Array.isArray(attRes.data)) {
                attendeesList = attRes.data;
            } else {
                attendeesList = [];
            }
        } catch (err) {
            console.log('Error fetching event attendees:', err);
            attendeesList = [];
        }

        renderMetrics();
        renderAttendeesTable(attendeesList);
        renderTicketTiers();
        renderEventSchedule();
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
                    <td colspan="6" class="dash-table-empty">
                        <span class="material-symbols-outlined dash-empty-icon">group_off</span>
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
            const statusLabel = isCheckedIn ? 'Checked In' : 'Going';
            const rsvpCode = `RSVP-${String(att.id).padStart(4, '0')}`;
            const name = att.name || 'Member';
            const email = att.email || '—';
            const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

            const actionBtn = isCheckedIn
                ? `<span class="attendee-status-checked">
                     <span class="material-symbols-outlined">check_circle</span> Checked In
                   </span>`
                : `<button type="button" class="btn btn-outline-teal btn-sm admin-btn-xs" data-action="checkin" data-id="${att.id}">
                     <span class="material-symbols-outlined">how_to_reg</span> Check In
                   </button>`;

            return `
                <tr>
                    <td>
                        <div class="attendee-user-cell">
                            <div class="attendee-avatar">
                                ${initials}
                            </div>
                            <div>
                                <div class="dash-user-name">${name}</div>
                                <div class="dash-user-sub">${email}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="dash-mono-id">${rsvpCode}</span>
                    </td>
                    <td>
                        <span class="font-semibold">General Admission</span>
                    </td>
                    <td>
                        <span class="font-bold">${priceLabel}</span>
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

        if (!tbody.dataset.bound) {
            tbody.dataset.bound = 'true';
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action="checkin"]');
                if (btn) {
                    const rsvpId = Number(btn.getAttribute('data-id'));
                    handleCheckin(rsvpId, btn);
                }
            });
        }
    }

    // 7. Check-in Handler
    async function handleCheckin(rsvpId, btn) {
        btn.disabled = true;
        btn.textContent = 'Processing…';
        try {
            const res = await checkinEventAttendee(currentEvent.id, rsvpId);
            if (res && res.success) {
                showToast('Attendee checked in successfully!', 'success');
                // Update local attendee record
                const att = attendeesList.find(a => a.id === rsvpId);
                if (att) att.status = 'checked_in';
                renderMetrics();
                applyAttendeeFilters();
            } else {
                showToast(res?.message || 'Check-in failed.', 'error');
                btn.disabled = false;
                btn.textContent = 'Check In';
            }
        } catch (e) {
            console.error('Check-in error:', e);
            showToast('Connection error during check-in.', 'error');
            btn.disabled = false;
            btn.textContent = 'Check In';
        }
    }

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

    // 9. Render Ticket Tiers Dynamically
    function renderTicketTiers() {
        const grid = document.getElementById('manageTicketTiersGrid');
        if (!grid) return;

        const isFree = currentEvent.is_free || !currentEvent.min_price || Number(currentEvent.min_price) === 0;
        const priceLabel = isFree ? 'Free Admission' : `NPR ${Number(currentEvent.min_price).toLocaleString()}`;
        const tierTitle = isFree ? 'Standard RSVP Pass' : 'General Admission Pass';
        const capacity = currentEvent.capacity || 0;
        const sold = attendeesList.length;
        const rawPct = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : (sold > 0 ? 100 : 0);
        const bucket = Math.round(rawPct / 10) * 10;
        const widthClass = `progress-w-${bucket}`;
        const capacityText = capacity > 0 ? `Sold: ${sold} / ${capacity}` : `Registered: ${sold} (Open Admission)`;
        const fillClass = rawPct >= 90 ? 'progress-fill-warning' : 'progress-fill-primary';

        grid.innerHTML = `
            <div class="manage-tier-card">
                <div class="manage-tier-header">
                    <div>
                        <h3 class="manage-tier-title">${tierTitle}</h3>
                        <span class="manage-tier-price">${priceLabel}</span>
                    </div>
                    <span class="badge badge-status-confirmed">Active</span>
                </div>
                <div class="manage-progress-meta">
                    <span>${capacityText}</span>
                    <strong>${rawPct}%</strong>
                </div>
                <div class="progress-track">
                    <div class="progress-fill ${fillClass} ${widthClass}"></div>
                </div>
                <button class="btn btn-outline btn-block btn-sm" onclick="showToast('Capacity settings active for this event', 'info')">Capacity Settings</button>
            </div>
        `;
    }

    // 10. Render Event Schedule Dynamically
    function renderEventSchedule() {
        const timeline = document.getElementById('manageScheduleTimeline');
        if (!timeline) return;

        const startTime = currentEvent.start_time ? currentEvent.start_time.slice(0, 5) + ' NPT' : '10:00 NPT';
        const endTime = currentEvent.end_time ? currentEvent.end_time.slice(0, 5) + ' NPT' : '';
        const venue = currentEvent.is_online ? 'Online Platform' : (currentEvent.venue || currentEvent.city || 'Event Venue');
        const organizer = currentEvent.organizer_name || 'Event Host';

        timeline.innerHTML = `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-time">${startTime} • ${venue}</div>
                <div class="timeline-title">Doors Open & Registration Check-in</div>
                <div class="timeline-speaker">Organized by ${organizer}</div>
            </div>
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-time">${startTime} ${endTime ? '- ' + endTime : 'onwards'} • Main Hall</div>
                <div class="timeline-title">${currentEvent.title}</div>
                <div class="timeline-speaker">${currentEvent.category || 'Community'} Session</div>
            </div>
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-time">${endTime || 'Wrap-up'} • ${venue}</div>
                <div class="timeline-title">Community Networking & Concluding Remarks</div>
                <div class="timeline-speaker">All Attendees & Guests</div>
            </div>
        `;
    }

    // 11. Real Cancel Event Handler
    const btnCancel = document.getElementById('btnCancelManageEvent');
    if (btnCancel) {
        btnCancel.addEventListener('click', async () => {
            if (!confirm(`Are you sure you want to cancel and delete "${currentEvent.title}"? This cannot be undone.`)) return;
            btnCancel.disabled = true;
            btnCancel.textContent = 'Processing...';
            try {
                const res = await deleteEvent(currentEvent.id);
                if (res && res.success) {
                    if (typeof showToast === 'function') showToast('Event cancelled successfully.', 'success');
                    setTimeout(() => { window.location.href = 'my-activities.html'; }, 1000);
                } else {
                    if (typeof showToast === 'function') showToast(res?.message || 'Could not cancel event.', 'error');
                    btnCancel.disabled = false;
                    btnCancel.textContent = 'Cancel Event';
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast('Network error cancelling event.', 'error');
                btnCancel.disabled = false;
                btnCancel.textContent = 'Cancel Event';
            }
        });
    }

    // 12. Real Dynamic Attendee CSV Exporter
    function exportAttendeesCSV() {
        if (!attendeesList || attendeesList.length === 0) {
            showToast('No attendees registered to export.', 'info');
            return;
        }

        const headers = ['RSVP Code', 'Name', 'Email', 'Tier', 'Status', 'Registered At'];
        const rows = attendeesList.map(a => [
            `RSVP-${String(a.id).padStart(4, '0')}`,
            `"${(a.name || 'Member').replace(/"/g, '""')}"`,
            `"${(a.email || '').replace(/"/g, '""')}"`,
            'General Admission',
            a.status === 'checked_in' ? 'Checked In' : 'Confirmed',
            `"${a.created_at || ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        const eventSlug = (currentEvent?.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        link.setAttribute('download', `${eventSlug}-attendees.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Attendee roster downloaded successfully.', 'success');
    }

    const exportBtn = document.getElementById('exportAttendeesBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportAttendeesCSV);
    }

    const shareBtn = document.getElementById('btnShareManageEvent');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const url = window.location.origin + '/pages/event-details.html?id=' + eventId;
            navigator.clipboard.writeText(url);
            showToast('Public event URL copied!', 'success');
        });
    }

    const addAgendaBtn = document.getElementById('btnAddAgendaItem');
    if (addAgendaBtn) {
        addAgendaBtn.addEventListener('click', () => {
            showToast('Session agenda updated', 'info');
        });
    }

    // 13. Announcements Management
    async function loadManageAnnouncements() {
        const container = document.getElementById('manageAnnouncementsList');
        if (!container) return;

        try {
            const res = await getEventAnnouncements(eventId);
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                container.innerHTML = res.data.map(item => {
                    const timeFormatted = new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                    });
                    return `
                        <div class="announcement-manage-item">
                            <div class="d-flex justify-between items-start">
                                <div>
                                    <h4 class="announcement-item-title">${item.title}</h4>
                                    <span class="announcement-meta-time">Posted by ${item.author_name || 'Host'} • ${timeFormatted}</span>
                                </div>
                                <button type="button" class="btn btn-outline btn-outline-danger btn-sm" data-action="delete-announcement" data-id="${item.id}">
                                    <span class="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                            <p class="announcement-item-body">${(item.message || '').replace(/\n/g, '<br>')}</p>
                        </div>
                    `;
                }).join('');
                return;
            }
        } catch (err) {
            console.log('Error loading announcements for manager:', err);
        }

        container.innerHTML = `
            <div class="dash-empty-box py-2">
                <span class="material-symbols-outlined dash-empty-icon">campaign</span>
                <p class="text-muted">No broadcasts posted yet. Use the form above to send your first announcement.</p>
            </div>
        `;
    }

    const formPostAnnouncement = document.getElementById('formPostAnnouncement');
    if (formPostAnnouncement) {
        formPostAnnouncement.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('announcementTitleInput');
            const messageInput = document.getElementById('announcementMessageInput');
            const submitBtn = document.getElementById('btnSubmitAnnouncement');

            const title = titleInput ? titleInput.value.trim() : '';
            const message = messageInput ? messageInput.value.trim() : '';

            if (!title || !message) {
                showToast('Title and message are required', 'info');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Broadcasting...';

            try {
                const res = await createEventAnnouncement(eventId, { title, message });
                if (res && res.success) {
                    showToast('Announcement broadcasted to attendees!', 'success');
                    if (titleInput) titleInput.value = '';
                    if (messageInput) messageInput.value = '';
                    await loadManageAnnouncements();
                } else {
                    showToast(res?.message || 'Failed to post announcement', 'error');
                }
            } catch (err) {
                console.log('Error broadcasting announcement:', err);
                showToast('Network error while posting announcement', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span class="material-symbols-outlined">campaign</span> <span>Broadcast to Attendees</span>';
            }
        });
    }

    const announcementsListEl = document.getElementById('manageAnnouncementsList');
    if (announcementsListEl) {
        announcementsListEl.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action="delete-announcement"]');
            if (btn) {
                const id = btn.getAttribute('data-id');
                if (!confirm('Are you sure you want to delete this announcement?')) return;
                btn.disabled = true;
                try {
                    const res = await deleteEventAnnouncement(eventId, id);
                    if (res && res.success) {
                        showToast('Announcement deleted', 'success');
                        await loadManageAnnouncements();
                    } else {
                        showToast(res?.message || 'Failed to delete announcement', 'error');
                        btn.disabled = false;
                    }
                } catch (err) {
                    console.log('Error deleting announcement:', err);
                    showToast('Network error deleting announcement', 'error');
                    btn.disabled = false;
                }
            }
        });
    }

    // 14. Team & Co-Managers Management
    async function loadManageTeam() {
        const container = document.getElementById('manageTeamList');
        if (!container) return;

        try {
            const res = await getEventManagers(eventId);
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                container.innerHTML = res.data.map(m => {
                    const initials = (m.name || 'Member').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                    return `
                        <div class="team-member-item">
                            <div class="d-flex items-center gap-0-75">
                                <div class="team-member-avatar">${initials}</div>
                                <div>
                                    <div class="team-member-name">${m.name}</div>
                                    <div class="team-member-email">${m.email}</div>
                                </div>
                            </div>
                            <button type="button" class="btn btn-outline btn-outline-danger btn-sm" data-action="remove-manager" data-id="${m.user_id}">
                                <span class="material-symbols-outlined">person_remove</span>
                                <span>Remove</span>
                            </button>
                        </div>
                    `;
                }).join('');
                return;
            }
        } catch (err) {
            console.log('Error loading event managers:', err);
        }

        container.innerHTML = `
            <div class="dash-empty-box py-2">
                <span class="material-symbols-outlined dash-empty-icon">group_off</span>
                <p class="text-muted">No co-managers assigned yet. Add team members by email to share gate check-in and announcement privileges.</p>
            </div>
        `;
    }

    const formAddManager = document.getElementById('formAddManager');
    if (formAddManager) {
        formAddManager.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('managerEmailInput');
            const submitBtn = document.getElementById('btnAddManagerSubmit');
            const email = emailInput ? emailInput.value.trim() : '';

            if (!email) {
                showToast('Please enter a team member email', 'info');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';

            try {
                const res = await addEventManager(eventId, email);
                if (res && res.success) {
                    showToast(res.message || 'Co-manager added successfully!', 'success');
                    if (emailInput) emailInput.value = '';
                    await loadManageTeam();
                } else {
                    showToast(res?.message || 'Failed to add co-manager', 'error');
                }
            } catch (err) {
                console.log('Error adding co-manager:', err);
                showToast('Network error while adding co-manager', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span class="material-symbols-outlined">person_add</span> <span>Add Co-Manager</span>';
            }
        });
    }

    const teamListEl = document.getElementById('manageTeamList');
    if (teamListEl) {
        teamListEl.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action="remove-manager"]');
            if (btn) {
                const userId = btn.getAttribute('data-id');
                if (!confirm('Remove this co-manager from the event?')) return;
                btn.disabled = true;
                try {
                    const res = await removeEventManager(eventId, userId);
                    if (res && res.success) {
                        showToast('Co-manager removed', 'success');
                        await loadManageTeam();
                    } else {
                        showToast(res?.message || 'Failed to remove co-manager', 'error');
                        btn.disabled = false;
                    }
                } catch (err) {
                    console.log('Error removing co-manager:', err);
                    showToast('Network error removing co-manager', 'error');
                    btn.disabled = false;
                }
            }
        });
    }

    // 15. Manual Attendee by Email
    const btnAddManual = document.getElementById('btnAddManualAttendeeBtn');
    const modalManual = document.getElementById('manualAttendeeModal');
    const btnCloseManual = document.getElementById('btnCloseManualRsvp');
    const formManual = document.getElementById('formManualAttendee');

    if (btnAddManual && modalManual) {
        btnAddManual.addEventListener('click', () => {
            modalManual.classList.add('open');
            document.body.classList.add('modal-open');
        });
    }

    function closeManualModal() {
        if (modalManual) {
            modalManual.classList.remove('open');
            document.body.classList.remove('modal-open');
        }
    }

    if (btnCloseManual) {
        btnCloseManual.addEventListener('click', closeManualModal);
    }
    if (modalManual) {
        modalManual.addEventListener('click', (e) => {
            if (e.target === modalManual) closeManualModal();
        });
    }

    if (formManual) {
        formManual.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('manualAttendeeEmail');
            const submitBtn = document.getElementById('btnSubmitManualAttendee');
            const email = emailInput ? emailInput.value.trim() : '';

            if (!email) {
                showToast('Please enter an attendee email', 'info');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Registering...';

            try {
                const res = await addManualAttendee(eventId, email);
                if (res && res.success) {
                    showToast(res.message || 'Attendee registered successfully!', 'success');
                    if (emailInput) emailInput.value = '';
                    closeManualModal();
                    await loadAttendees();
                } else {
                    showToast(res?.message || 'Failed to register attendee', 'error');
                }
            } catch (err) {
                console.log('Error registering manual attendee:', err);
                showToast('Network error registering attendee', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm Registration';
            }
        });
    }
});
