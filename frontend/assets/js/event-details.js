import { getUser, isAuthenticated } from './authService.js';
import { getEvent, getEventAttendees, rsvpToEvent, cancelEventRsvp } from './api.js';
import { showToast } from './main.js';

// Event details page logic

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Event ID from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const eventIdParam = urlParams.get('id');

    // Category banner fallback image generator
    const categoryImages = {
        'tech': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
        'software': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
        'business': 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
        'design': 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80',
        'music': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
        'health': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
        'social': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
    };

    function getCoverImage(cat) {
        if (!cat) return categoryImages['tech'];
        const lower = cat.toLowerCase();
        for (const [key, url] of Object.entries(categoryImages)) {
            if (lower.includes(key)) return url;
        }
        return categoryImages['tech'];
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
        if (typeof showToast === 'function') showToast('Event could not be located.', 'error');
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

    const timeStr = currentEvent.start_time ? currentEvent.start_time.slice(0, 5) : '10:00 AM';
    const endTimeStr = currentEvent.end_time ? currentEvent.end_time.slice(0, 5) : '';

    // Price formatting
    const isFree = currentEvent.is_free || !currentEvent.min_price || currentEvent.min_price == 0;
    const priceText = isFree ? 'FREE' : `NPR ${Number(currentEvent.min_price).toLocaleString()}`;

    // Host initials
    const hostName = currentEvent.organizer_name || 'Community Organizer';
    const hostInitials = hostName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'CO';

    // 4. Hydrate DOM elements
    const topEventDate = document.getElementById('topEventDate');
    if (topEventDate) topEventDate.textContent = isTba ? 'Date to be Announced' : `${dateFormattedShort} · ${timeStr} NPT`;

    const topEventTitle = document.getElementById('topEventTitle');
    if (topEventTitle) {
        topEventTitle.textContent = currentEvent.title;
        document.title = `${currentEvent.title} — Aavahan`;
    }

    const topHostAvatar = document.getElementById('topHostAvatar');
    if (topHostAvatar) topHostAvatar.textContent = hostInitials;

    const topHostName = document.getElementById('topHostName');
    if (topHostName) topHostName.textContent = `Hosted by ${hostName}`;

    const eventCoverImg = document.getElementById('eventCoverImg');
    if (eventCoverImg) eventCoverImg.src = currentEvent.image_url || getCoverImage(currentEvent.category);

    const eventDetailsText = document.getElementById('eventDetailsText');
    if (eventDetailsText) {
        eventDetailsText.innerHTML = (currentEvent.description || 'Join us for this exciting community gathering. Connect with like-minded individuals, share knowledge, and learn something new.')
            .split('\n\n')
            .map(p => `<p class="mb-1">${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    // Sidebar widgets
    const sidebarGroupName = document.getElementById('sidebarGroupName');
    if (sidebarGroupName) sidebarGroupName.textContent = currentEvent.group_name || (currentEvent.category ? `${currentEvent.category} Group` : (currentEvent.city ? `${currentEvent.city} Community Group` : 'Community Group'));

    const sidebarDateText = document.getElementById('sidebarDateText');
    if (sidebarDateText) sidebarDateText.textContent = isTba ? 'Date to be Announced' : dateFormattedLong;

    const sidebarTimeText = document.getElementById('sidebarTimeText');
    if (sidebarTimeText) sidebarTimeText.textContent = isTba ? 'Time to be Announced' : (endTimeStr ? `${timeStr} to ${endTimeStr} NPT` : `${timeStr} NPT onwards`);

    // Registration deadline display
    const isDeadlinePassed = Boolean(
        currentEvent.registration_deadline && new Date() > new Date(currentEvent.registration_deadline)
    );
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
    if (sidebarVenueName) sidebarVenueName.textContent = currentEvent.is_online ? 'Online Zoom / Google Meet' : (currentEvent.venue || currentEvent.city || 'Location TBD');

    const sidebarAddressText = document.getElementById('sidebarAddressText');
    if (sidebarAddressText) sidebarAddressText.textContent = currentEvent.is_online ? 'Link will be sent to registered attendees' : (currentEvent.address || currentEvent.city || 'Location TBD');

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
        const commentAvatar = document.getElementById('commentUserAvatar');
        if (commentAvatar) commentAvatar.textContent = storedUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    }
    if (storedUser.email) {
        const rsvpEmailInput = document.getElementById('rsvpEmail');
        if (rsvpEmailInput) rsvpEmailInput.value = storedUser.email;
    }

    // Hydrate Attendees Faces
    loadAttendeesList(currentEvent.id);

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
            } else if (isDeadlinePassed) {
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
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing RSVP…';

            try {
                const res = await rsvpToEvent(currentEvent.id);
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
                    if (passEventTime) passEventTime.textContent = `${dateFormattedShort} · ${timeStr} NPT`;
                    if (passEventVenue) passEventVenue.textContent = currentEvent.is_online ? 'Online Event' : (currentEvent.venue || currentEvent.city || 'Location TBD');
                    const dynamicTicketCode = res.rsvpId ? `RSVP-${String(res.rsvpId).padStart(4, '0')}` : `RSVP-${currentEvent.id}`;
                    if (passTicketId) passTicketId.textContent = dynamicTicketCode;

                    // Update attendee count on page
                    currentEvent.attendee_count = (currentEvent.attendee_count || 0) + 1;
                    if (attendeesHeaderCount) attendeesHeaderCount.textContent = `Attendees (${currentEvent.attendee_count})`;

                    updateAttendButtonsState(true);

                    // Reload attendees
                    loadAttendeesList(currentEvent.id);

                    if (typeof showToast === 'function') {
                        showToast('RSVP confirmed! See you at the event.', 'success');
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast(res?.message || 'Could not complete RSVP.', 'error');
                    } else {
                        alert(res?.message || 'RSVP failed');
                    }
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Confirm RSVP & Attend';
                }
            } catch (err) {
                console.error('RSVP submission error:', err);
                if (typeof showToast === 'function') {
                    showToast('Connection error during RSVP. Please try again.', 'error');
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm RSVP & Attend';
            }
        });
    }

    // 7. Discussion & Comments
    const commentInput = document.getElementById('commentInput');
    const btnPostComment = document.getElementById('btnPostComment');
    const commentsList = document.getElementById('meetupCommentsList');

    if (btnPostComment && commentInput && commentsList) {
        btnPostComment.addEventListener('click', () => {
            const text = commentInput.value.trim();
            if (!text) {
                if (typeof showToast === 'function') showToast('Please enter a comment.', 'info');
                return;
            }

            const u = getUser() || {};
            const userName = u.name || 'Community Member';

            const initials = userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

            const newComment = document.createElement('div');
            newComment.className = 'comment-item';
            newComment.innerHTML = `
                <div class="comment-avatar">
                    ${initials}
                </div>
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-author">${userName}</span>
                        <span class="comment-time">Just now</span>
                    </div>
                    <div class="comment-text">${text.replace(/\n/g, '<br>')}</div>
                </div>
            `;
            commentsList.prepend(newComment);
            commentInput.value = '';
            if (typeof showToast === 'function') showToast('Comment posted!', 'success');
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
                            <div class="attendee-face-item" title="${name}">
                                <div class="attendee-face-circle">
                                    ${initials}
                                </div>
                                <span class="attendee-face-name">${name.split(' ')[0]}</span>
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
});
