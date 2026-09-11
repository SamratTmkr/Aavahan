// ============================================================
// Event Details Page Logic — event-details.js
// ============================================================

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

    // Fallback: if no ID or not found in DB, try fetching first event from list
    if (!currentEvent) {
        try {
            const listRes = await getEvents();
            if (listRes && listRes.success && listRes.data && listRes.data.length) {
                currentEvent = listRes.data[0];
            }
        } catch(e) {}
    }

    if (!currentEvent) {
        const titleEl = document.getElementById('topEventTitle');
        if (titleEl) titleEl.textContent = 'Event Not Found';
        if (typeof showToast === 'function') showToast('Event could not be located.', 'error');
        return;
    }

    // 3. Format Date and Time
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
    if (topEventDate) topEventDate.textContent = `${dateFormattedShort} · ${timeStr} NPT`;

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
    if (eventCoverImg) eventCoverImg.src = getCoverImage(currentEvent.category);

    const eventDetailsText = document.getElementById('eventDetailsText');
    if (eventDetailsText) {
        eventDetailsText.innerHTML = (currentEvent.description || 'Join us for this exciting community gathering. Connect with like-minded individuals, share knowledge, and learn something new.')
            .split('\n\n')
            .map(p => `<p style="margin-bottom:1rem;">${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    // Sidebar widgets
    const sidebarGroupName = document.getElementById('sidebarGroupName');
    if (sidebarGroupName) sidebarGroupName.textContent = currentEvent.group_name || `${currentEvent.category || 'General'} Enthusiasts Kathmandu`;

    const sidebarDateText = document.getElementById('sidebarDateText');
    if (sidebarDateText) sidebarDateText.textContent = dateFormattedLong;

    const sidebarTimeText = document.getElementById('sidebarTimeText');
    if (sidebarTimeText) sidebarTimeText.textContent = endTimeStr ? `${timeStr} to ${endTimeStr} NPT` : `${timeStr} NPT onwards`;

    const sidebarVenueName = document.getElementById('sidebarVenueName');
    if (sidebarVenueName) sidebarVenueName.textContent = currentEvent.is_online ? 'Online Zoom / Google Meet' : (currentEvent.venue || 'Kathmandu, Nepal');

    const sidebarAddressText = document.getElementById('sidebarAddressText');
    if (sidebarAddressText) sidebarAddressText.textContent = currentEvent.is_online ? 'Link will be sent to registered attendees' : (currentEvent.address || currentEvent.city || 'Kathmandu, Nepal');

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
    try {
        const storedUser = JSON.parse(localStorage.getItem('aavahan_user') || '{}');
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
    } catch(e) {}

    // Hydrate Attendees Faces
    loadAttendeesList(currentEvent.id);

    // 5. RSVP Modal Controls
    const rsvpModal = document.getElementById('meetupRsvpModal');

    function openModal() {
        if (rsvpModal) {
            rsvpModal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        if (rsvpModal) {
            rsvpModal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    // Expose to window for inline onclick attributes
    window.closeModal = closeModal;
    window.openModal = openModal;

    // Attach open trigger to all Attend buttons
    document.querySelectorAll('.btn-attend-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const token = localStorage.getItem('aavahan_token') || sessionStorage.getItem('aavahan_token');
            if (!token) {
                if (typeof showToast === 'function') {
                    showToast('Please log in to RSVP for this event.', 'info');
                }
                setTimeout(() => {
                    window.location.href = `login.html?redirect=event-details.html?id=${currentEvent.id}`;
                }, 1000);
                return;
            }
            openModal();
        });
    });

    // Close button inside modal header
    const closeBtn = rsvpModal?.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

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
                    if (formPane) formPane.style.display = 'none';
                    if (successPane) successPane.style.display = 'block';

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
                    if (passEventVenue) passEventVenue.textContent = currentEvent.venue || 'Kathmandu, Nepal';
                    if (passTicketId) passTicketId.textContent = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

                    // Update attendee count on page
                    currentEvent.attendee_count = (currentEvent.attendee_count || 0) + 1;
                    if (attendeesHeaderCount) attendeesHeaderCount.textContent = `Attendees (${currentEvent.attendee_count})`;

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

            let userName = 'Community Member';
            try {
                const u = JSON.parse(localStorage.getItem('aavahan_user') || '{}');
                if (u.name) userName = u.name;
            } catch(e) {}

            const initials = userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

            const newComment = document.createElement('div');
            newComment.style.cssText = 'display:flex;gap:1rem;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border-subtle);animation:aavToastIn 0.3s ease;';
            newComment.innerHTML = `
                <div style="width:40px;height:40px;border-radius:50%;background:#00828a;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;">
                    ${initials}
                </div>
                <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;">
                        <span style="font-weight:700;font-size:0.95rem;">${userName}</span>
                        <span style="font-size:0.75rem;color:var(--text-muted);">Just now</span>
                    </div>
                    <div style="font-size:0.9rem;color:var(--text-secondary);line-height:1.5;">${text.replace(/\n/g, '<br>')}</div>
                </div>
            `;
            commentsList.prepend(newComment);
            commentInput.value = '';
            if (typeof showToast === 'function') showToast('Comment posted!', 'success');
        });
    }

    // 8. Load Attendees function
    async function loadAttendeesList(eventId) {
        const grid = document.getElementById('attendeesFacesGrid');
        if (!grid) return;

        try {
            const res = await getEventAttendees(eventId);
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                grid.innerHTML = res.data.map(attendee => {
                    const name = attendee.name || 'Member';
                    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                    return `
                        <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:0.3rem;" title="${name}">
                            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#00828a,#006e73);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                                ${initials}
                            </div>
                            <span style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60px;">${name.split(' ')[0]}</span>
                        </div>
                    `;
                }).join('');
                return;
            }
        } catch(e) {}

        // Fallback roster faces for prototype demonstration
        const mockRoster = [
            'Alex Shrestha', 'Prabhat Gurung', 'Pooja Manandhar', 'Roshan Adhikari',
            'Anjali Karki', 'Samrat Tamrakar', 'Kripa Sharma', 'Sujan Thapa'
        ];
        grid.innerHTML = mockRoster.map(name => {
            const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
            return `
                <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:0.3rem;" title="${name}">
                    <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#00828a,#0f766e);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                        ${initials}
                    </div>
                    <span style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60px;">${name.split(' ')[0]}</span>
                </div>
            `;
        }).join('');
    }
});
