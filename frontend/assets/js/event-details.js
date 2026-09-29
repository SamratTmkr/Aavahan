import { getUser, isAuthenticated } from './authService.js';
import { getEvent, getEventAttendees, rsvpToEvent, cancelEventRsvp, getEventAnnouncements } from './api.js';
import { showToast, escapeHtml } from './main.js';
import { phoneProblem } from './phone.js';

// Event details page logic

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Event ID from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const eventIdParam = urlParams.get('id');

    // Cover for events without an uploaded banner, from the bundled images (same mapping as the home page)
    function getCoverImage(cat) {
        const lower = (cat || '').toLowerCase();
        if (/tech|software|\bai\b|code/.test(lower)) return '../assets/images/tech-summit.jpg';
        if (/music|concert|live/.test(lower)) return '../assets/images/music-jam.jpg';
        if (/outdoor|hiking|nature|trail/.test(lower)) return '../assets/images/outdoor-hiking.jpg';
        if (/business|pitch|career|startup/.test(lower)) return '../assets/images/startup-pitch.jpg';
        return '../assets/images/community-banner.jpg';
    }

    let currentEvent = null;

    // 2. Fetch event data
    if (eventIdParam) {
        try {
            const res = await getEvent(eventIdParam);
            if (res && res.success && res.data) {
                currentEvent = res.data;
            }
        } catch (e) {
            console.error('Error fetching event details:', e);
        }
    }

    if (!currentEvent) {
        const titleEl = document.getElementById('topEventTitle');
        if (titleEl) titleEl.textContent = 'Event Not Found';
        const dateEl = document.getElementById('topEventDate');
        if (dateEl) dateEl.textContent = 'Please check the link or browse active events.';
        const detailsEl = document.getElementById('eventDetailsText');
        if (detailsEl) detailsEl.innerHTML = '<p class="mb-1">The requested event could not be found or has been removed.</p><a href="explore.html" class="btn btn-primary btn-pill btn-sm">Explore Other Events</a>';
        showToast('Event could not be located.', 'error');
        return;
    }

    // 3. Format Date and Time
    const isTba = Boolean(currentEvent.is_date_tba || !currentEvent.event_date);
    const eventDate = currentEvent.event_date ? new Date(currentEvent.event_date) : new Date();
    const dateFormattedLong = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const dateFormattedShort = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    }).toUpperCase();

    const timeStr = currentEvent.start_time ? currentEvent.start_time.slice(0, 5) : '';
    const endTimeStr = currentEvent.end_time ? currentEvent.end_time.slice(0, 5) : '';
    // "SAT, OCT 4 · 18:00 NPT", or just the date when no start time is set
    const shortWhen = timeStr ? `${dateFormattedShort} · ${timeStr} NPT` : dateFormattedShort;

    // Price formatting
    const isFree = currentEvent.is_free || !currentEvent.min_price || currentEvent.min_price == 0;
    const priceText = isFree ? 'FREE' : `NPR ${Number(currentEvent.min_price).toLocaleString()}`;

    // Host initials
    const hostName = currentEvent.host_name || currentEvent.organizer_name || 'Community Organizer';
    const hostInitials = hostName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'CO';

    // 4. Hydrate DOM elements
    const topEventDate = document.getElementById('topEventDate');
    if (topEventDate) topEventDate.textContent = isTba ? 'Date to be Announced' : shortWhen;

    const topEventTitle = document.getElementById('topEventTitle');
    if (topEventTitle) {
        topEventTitle.textContent = currentEvent.title;
        document.title = `${currentEvent.title} — Aavahan`;
    }

    const topHostAvatar = document.getElementById('topHostAvatar');
    if (topHostAvatar) {
        topHostAvatar.textContent = hostInitials;
        if (currentEvent.host_logo_url) {
            const logo = document.createElement('img');
            logo.src = currentEvent.host_logo_url;
            logo.alt = hostName;
            // keep the initials if the logo file cannot be loaded
            logo.addEventListener('load', () => {
                topHostAvatar.textContent = '';
                topHostAvatar.classList.add('has-logo');
                topHostAvatar.appendChild(logo);
            });
        }
    }

    const topHostName = document.getElementById('topHostName');
    if (topHostName) topHostName.textContent = `Hosted by ${hostName}`;

    // Show "Manage Event" button in the banner actions if the viewer is the organiser or an admin
    const storedUserForManage = getUser();
    const isOrganizer = storedUserForManage &&
        (Number(storedUserForManage.id) === Number(currentEvent.organizer_id) ||
         storedUserForManage.role === 'admin');
    if (isOrganizer) {
        const topActionsWrap = document.querySelector('.meetup-top-container .top-actions-wrap');
        if (topActionsWrap) {
            const manageBtn = document.createElement('a');
            manageBtn.href = `manage-event.html?id=${currentEvent.id}`;
            manageBtn.className = 'btn btn-outline-teal btn-pill';
            manageBtn.innerHTML = '<span class="material-symbols-outlined">tune</span><span>Manage Event</span>';
            // Insert before the Share button so it stays leftmost
            topActionsWrap.insertBefore(manageBtn, topActionsWrap.firstChild);
        }
    }


    const eventCoverImg = document.getElementById('eventCoverImg');
    if (eventCoverImg) {
        // If the uploaded banner file is missing, fall back to the category cover
        eventCoverImg.addEventListener('error', () => {
            eventCoverImg.src = getCoverImage(currentEvent.category);
        }, { once: true });
        eventCoverImg.src = currentEvent.image_url || getCoverImage(currentEvent.category);
    }

    const eventDetailsText = document.getElementById('eventDetailsText');
    if (eventDetailsText) {
        eventDetailsText.innerHTML = escapeHtml(currentEvent.description || 'No description provided.')
            .split('\n\n')
            .map(p => `<p class="mb-1">${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    // Sidebar widgets
    // Only show the group card when the event really belongs to a group
    const sidebarGroupName = document.getElementById('sidebarGroupName');
    if (sidebarGroupName) {
        if (currentEvent.group_name) {
            sidebarGroupName.textContent = currentEvent.group_name;
        } else {
            sidebarGroupName.closest('.meetup-sidebar-widget').classList.add('is-hidden');
        }
    }

    const sidebarDateText = document.getElementById('sidebarDateText');
    if (sidebarDateText) sidebarDateText.textContent = isTba ? 'Date to be Announced' : dateFormattedLong;

    const sidebarTimeText = document.getElementById('sidebarTimeText');
    if (sidebarTimeText) sidebarTimeText.textContent = (isTba || !timeStr) ? 'Time to be Announced' : (endTimeStr ? `${timeStr} to ${endTimeStr} NPT` : `${timeStr} NPT onwards`);

    // Registration deadline display
    const isDeadlinePassed = Boolean(
        currentEvent.registration_deadline && new Date() > new Date(currentEvent.registration_deadline)
    );

    // An event that has ended cannot be registered for (the API refuses it too)
    const lastDay = currentEvent.end_date || currentEvent.event_date;
    const isPast = lastDay ? lastDay.slice(0, 10) < new Date().toISOString().slice(0, 10) : false;
    const sidebarDeadlineContainer = document.getElementById('sidebarDeadlineContainer');
    const sidebarDeadlineText = document.getElementById('sidebarDeadlineText');
    if (sidebarDeadlineContainer && sidebarDeadlineText) {
        if (currentEvent.registration_deadline) {
            sidebarDeadlineContainer.classList.remove('is-hidden');
            const d = new Date(currentEvent.registration_deadline);
            sidebarDeadlineText.textContent = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            sidebarDeadlineContainer.classList.add('is-hidden');
        }
    }

    const sidebarVenueName = document.getElementById('sidebarVenueName');
    if (sidebarVenueName) sidebarVenueName.textContent = currentEvent.is_online ? 'Online event' : (currentEvent.venue || currentEvent.city || 'Location TBD');

    const sidebarAddressText = document.getElementById('sidebarAddressText');
    if (sidebarAddressText) sidebarAddressText.textContent = currentEvent.is_online ? 'Hosted online' : (currentEvent.address || currentEvent.city || 'Location TBD');

    const sidebarPriceText = document.getElementById('sidebarPriceText');
    if (sidebarPriceText) sidebarPriceText.textContent = priceText;

    const attendeesCount = currentEvent.attendee_count || 0;
    const attendeesHeaderCount = document.getElementById('attendeesHeaderCount');
    if (attendeesHeaderCount) attendeesHeaderCount.textContent = `Attendees (${attendeesCount})`;

    const sidebarSpotsText = document.getElementById('sidebarSpotsText');
    if (sidebarSpotsText) {
        if (currentEvent.capacity) {
            const left = Math.max(0, currentEvent.capacity - attendeesCount);
            sidebarSpotsText.textContent = `${left} spot${left === 1 ? '' : 's'} left`;
        } else {
            sidebarSpotsText.textContent = 'Open admission';
        }
    }

    // Modal Details
    const modalEventTitle = document.getElementById('modalEventTitle');
    if (modalEventTitle) modalEventTitle.textContent = currentEvent.title;

    const modalEventHost = document.getElementById('modalEventHost');
    if (modalEventHost) modalEventHost.textContent = `Hosted by ${hostName}`;

    const modalEventPrice = document.getElementById('modalEventPrice');
    if (modalEventPrice) modalEventPrice.textContent = priceText;

    // Hydrate current logged in user details in RSVP modal if available
    const storedUser = getUser() || {};
    if (storedUser.name) {
        const rsvpNameInput = document.getElementById('rsvpFullName');
        if (rsvpNameInput) rsvpNameInput.value = storedUser.name;
    }
    if (storedUser.email) {
        const rsvpEmailInput = document.getElementById('rsvpEmail');
        if (rsvpEmailInput) rsvpEmailInput.value = storedUser.email;
    }

    // Organiser contact number, if they gave one
    if (currentEvent.contact_phone) {
        const contactLink = document.getElementById('sidebarContactText');
        contactLink.textContent = currentEvent.contact_phone;
        contactLink.href = 'tel:' + currentEvent.contact_phone.replace(/\s/g, '');
        document.getElementById('sidebarContactContainer').classList.remove('is-hidden');
    }

    // Ask for a phone number in the RSVP form when the organiser requires one
    const rsvpPhoneCode = document.getElementById('rsvpPhoneCode');
    const rsvpPhoneNumber = document.getElementById('rsvpPhoneNumber');
    if (currentEvent.require_phone) {
        rsvpPhoneNumber.required = true;
        document.getElementById('rsvpPhoneGroup').classList.remove('is-hidden');
    }

    // Hydrate Attendees Faces
    loadAttendeesList(currentEvent.id);

    // Hydrate Announcements
    loadEventAnnouncements(currentEvent.id);

    // 5. RSVP Modal Controls
    const rsvpModal = document.getElementById('meetupRsvpModal');

    function openModal() {
        if (rsvpModal) {
            rsvpModal.classList.add('open');
            document.body.classList.add('modal-open');
        }
    }

    function closeModal() {
        if (rsvpModal) {
            rsvpModal.classList.remove('open');
            document.body.classList.remove('modal-open');
        }
    }

    let isUserAttending = false;

    function updateAttendButtonsState(attending) {
        isUserAttending = attending;
        document.querySelectorAll('.btn-attend-trigger').forEach(btn => {
            if (attending) {
                btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Attending (Cancel RSVP)';
                btn.classList.add('btn-cancel-rsvp');
                btn.classList.remove('btn-primary');
                btn.disabled = false;
            } else if (isDeadlinePassed || isPast) {
                btn.textContent = 'Registration Closed';
                btn.classList.remove('btn-cancel-rsvp');
                btn.classList.remove('btn-primary');
                btn.disabled = true;
            } else {
                btn.innerHTML = 'Attend';
                btn.classList.remove('btn-cancel-rsvp');
                btn.classList.add('btn-primary');
                btn.disabled = false;
            }
        });
    }

    // Attach open trigger to all Attend buttons
    document.querySelectorAll('.btn-attend-trigger').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!isAuthenticated()) {
                showToast('Please log in to RSVP for this event.', 'info');
                setTimeout(() => {
                    window.location.href = `login.html?redirect=event-details.html?id=${currentEvent.id}`;
                }, 1000);
                return;
            }

            if (isUserAttending) {
                if (confirm('Are you sure you want to cancel your registration for this event?')) {
                    const res = await cancelEventRsvp(currentEvent.id);
                    if (res && res.success) {
                        showToast('Registration cancelled.', 'success');
                        currentEvent.attendee_count = Math.max(0, (currentEvent.attendee_count || 1) - 1);
                        if (attendeesHeaderCount) attendeesHeaderCount.textContent = `Attendees (${currentEvent.attendee_count})`;
                        updateAttendButtonsState(false);
                        loadAttendeesList(currentEvent.id);
                    } else {
                        showToast(res?.message || 'Could not cancel RSVP.', 'error');
                    }
                }
                return;
            }

            openModal();
        });
    });

    // Close button inside modal header
    const closeBtn = rsvpModal?.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Done button inside modal
    const doneBtn = document.getElementById('btnDoneRsvpModal');
    if (doneBtn) doneBtn.addEventListener('click', closeModal);

    // Share button
    const shareDetailsBtn = document.getElementById('btnShareEventDetails');
    if (shareDetailsBtn) {
        shareDetailsBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href);
            showToast('Event link copied!', 'success');
        });
    }

    // Backdrop click close
    if (rsvpModal) {
        rsvpModal.addEventListener('click', (e) => {
            if (e.target === rsvpModal) closeModal();
        });
    }

    // 6. RSVP Form Submission
    const rsvpForm = document.getElementById('meetupRsvpForm');
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = rsvpForm.querySelector('button[type="submit"]');

            const details = {};
            if (currentEvent.require_phone) {
                const problem = phoneProblem(rsvpPhoneCode.value, rsvpPhoneNumber.value);
                if (problem) {
                    showToast(problem, 'error');
                    rsvpPhoneNumber.focus();
                    return;
                }
                details.phone_code = rsvpPhoneCode.value;
                details.phone_number = rsvpPhoneNumber.value.trim();
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing RSVP…';

            try {
                const res = await rsvpToEvent(currentEvent.id, details);
                if (res && res.success) {
                    const formPane = document.getElementById('rsvpFormPane');
                    const successPane = document.getElementById('rsvpSuccessPane');
                    if (formPane) formPane.classList.add('d-none');
                    if (successPane) successPane.classList.remove('d-none');

                    // Hydrate pass
                    const passUserName = document.getElementById('passUserName');
                    const passEventName = document.getElementById('passEventName');
                    const passEventTime = document.getElementById('passEventTime');
                    const passEventVenue = document.getElementById('passEventVenue');
                    const passTicketId = document.getElementById('passTicketId');

                    const fullName = document.getElementById('rsvpFullName')?.value || 'Guest Member';
                    if (passUserName) passUserName.textContent = fullName;
                    if (passEventName) passEventName.textContent = currentEvent.title;
                    if (passEventTime) passEventTime.textContent = isTba ? 'Date to be Announced' : shortWhen;
                    if (passEventVenue) passEventVenue.textContent = currentEvent.is_online ? 'Online Event' : (currentEvent.venue || currentEvent.city || 'Location TBD');
                    const dynamicTicketCode = res.rsvpId ? `RSVP-${String(res.rsvpId).padStart(4, '0')}` : `RSVP-${currentEvent.id}`;
                    if (passTicketId) passTicketId.textContent = dynamicTicketCode;

                    // Update attendee count on page
                    currentEvent.attendee_count = (currentEvent.attendee_count || 0) + 1;
                    if (attendeesHeaderCount) attendeesHeaderCount.textContent = `Attendees (${currentEvent.attendee_count})`;

                    updateAttendButtonsState(true);

                    // Reload attendees
                    loadAttendeesList(currentEvent.id);

                    showToast('RSVP confirmed! See you at the event.', 'success');
                } else {
                    showToast(res?.message || 'Could not complete RSVP.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Confirm RSVP & Attend';
                }
            } catch (err) {
                console.error('RSVP submission error:', err);
                showToast('Connection error during RSVP. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm RSVP & Attend';
            }
        });
    }

    // Load Attendees function
    async function loadAttendeesList(eventId) {
        const grid = document.getElementById('attendeesFacesGrid');
        if (!grid) return;

        try {
            const res = await getEventAttendees(eventId);
            if (res && res.success && Array.isArray(res.data)) {
                const currentUser = getUser();

                if (currentUser && currentUser.id) {
                    const attending = res.data.some(att => Number(att.user_id) === Number(currentUser.id));
                    updateAttendButtonsState(attending);
                }

                if (res.data.length > 0) {
                    grid.innerHTML = res.data.map(attendee => {
                        const name = attendee.name || 'Member';
                        const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                        return `
                            <div class="attendee-face-item" title="${escapeHtml(name)}">
                                <div class="attendee-face-circle">
                                    ${escapeHtml(initials)}
                                </div>
                                <span class="attendee-face-name">${escapeHtml(name.split(' ')[0])}</span>
                            </div>
                        `;
                    }).join('');
                    return;
                }
            }
        } catch(e) {}

        grid.innerHTML = `
            <div class="attendee-empty-text">
                No attendees registered yet. Be the first to RSVP!
            </div>
        `;
    }

    // Load Event Announcements
    async function loadEventAnnouncements(eventId) {
        const feed = document.getElementById('eventAnnouncementsFeed');
        const countBadge = document.getElementById('announcementsCountBadge');
        if (!feed) return;

        try {
            const res = await getEventAnnouncements(eventId);
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                if (countBadge) countBadge.textContent = res.data.length;

                feed.innerHTML = res.data.map(item => {
                    const authorName = item.author_name || 'Event Host';
                    const authorInitials = authorName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'EH';
                    const timeFormatted = new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                    });

                    return `
                        <div class="announcement-item-card">
                            <div class="announcement-card-header">
                                <div class="d-flex items-center gap-0-75">
                                    <div class="announcement-avatar">${escapeHtml(authorInitials)}</div>
                                    <div>
                                        <div class="d-flex items-center gap-0-5">
                                            <span class="announcement-author">${escapeHtml(authorName)}</span>
                                            <span class="announcement-verified-badge">
                                                <span class="material-symbols-outlined icon-verified">verified</span> Host
                                            </span>
                                        </div>
                                        <span class="announcement-time">${timeFormatted}</span>
                                    </div>
                                </div>
                            </div>
                            <h4 class="announcement-title">${escapeHtml(item.title)}</h4>
                            <div class="announcement-message-text">${escapeHtml(item.message || '').replace(/\n/g, '<br>')}</div>
                        </div>
                    `;
                }).join('');
                return;
            }
        } catch (err) {
            console.log('Error loading announcements:', err);
        }

        if (countBadge) countBadge.textContent = '0';
        feed.innerHTML = `
            <div class="announcement-empty-state">
                <span class="material-symbols-outlined announcement-empty-icon">campaign</span>
                <p class="announcement-empty-text">No announcements posted yet. Official updates from the host will appear here.</p>
            </div>
        `;
    }
});
