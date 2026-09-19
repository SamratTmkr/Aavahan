import { isAuthenticated, clearAuth } from './authService.js';
import { createEvent } from './api.js';

// Event Creation Wizard State
let currentStep = 1;
const totalSteps = 3;

const btnNext = document.getElementById('btnWizardNext');
const btnBack = document.getElementById('btnWizardBack');
const stepIndicator = document.getElementById('wizardStepIndicator');
const progressFill = document.getElementById('wizardProgressFill');

// Banner image selection state
let selectedBannerFile = null;

// Check authentication on page load
function requireAuth() {
    if (!isAuthenticated()) {
        const isSubfolder = window.location.pathname.includes('/pages/');
        window.location.href = isSubfolder ? 'login.html?redirect=create-event.html' : 'pages/login.html?redirect=create-event.html';
        return false;
    }
    return true;
}

// Category tag pill selector
const topicPills = document.querySelectorAll('.topic-tag-pill');
topicPills.forEach(pill => {
    pill.addEventListener('click', () => {
        topicPills.forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
    });
});

function getSelectedCategory() {
    const selected = document.querySelector('.topic-tag-pill.selected');
    return selected ? selected.textContent.replace(/^[\p{Emoji}\s]+/u, '').trim() : 'General';
}

// Initialize past date prevention
const dateInput = document.getElementById('eventDate');
const today = new Date().toISOString().split('T')[0];
if (dateInput) {
    dateInput.min = today;
}

// Date to be Announced (TBA) toggle
const tbaCheckbox = document.getElementById('dateTBA');
const timeInput = document.getElementById('eventStartTime');

if (tbaCheckbox && dateInput && timeInput) {
    tbaCheckbox.addEventListener('change', function () {
        dateInput.disabled = this.checked;
        timeInput.disabled = this.checked;
        if (this.checked) {
            dateInput.value = '';
            timeInput.value = '';
        }
    });
}

// Custom event banner upload listener
const bannerInput = document.getElementById("eventBanner");
const bannerPreview = document.getElementById("bannerPreview");
const bannerWrapper = document.getElementById("bannerPreviewWrapper");

bannerInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select an image.");
        e.target.value = "";
        return;
    }

    selectedBannerFile = file;

    bannerPreview.src = URL.createObjectURL(file);
    bannerWrapper.classList.remove("is-hidden");
});

// Update live summary preview for Step 3
function updateSummaryPreview() {
    const title = document.getElementById('eventTitle')?.value.trim() || 'Untitled Event';
    const category = getSelectedCategory();
    const city = document.getElementById('eventCity')?.value.trim() || 'Location TBD';
    const venue = document.getElementById('eventVenue')?.value.trim() || 'Venue TBD';
    const isTba = document.getElementById('dateTBA')?.checked;
    const date = document.getElementById('eventDate')?.value;
    const time = document.getElementById('eventStartTime')?.value || '';
    const deadline = document.getElementById('registrationDeadline')?.value;
    const price = parseFloat(document.getElementById('eventPrice')?.value) || 0;

    const summaryTitle = document.getElementById('summaryTitle');
    const summaryCategory = document.getElementById('summaryCategory');
    const summaryLocation = document.getElementById('summaryLocation');
    const summaryDateTime = document.getElementById('summaryDateTime');
    const summaryDeadline = document.getElementById('summaryDeadline');
    const summaryPrice = document.getElementById('summaryPrice');

    if (summaryTitle) summaryTitle.textContent = title;
    if (summaryCategory) summaryCategory.textContent = `📂 ${category}`;
    if (summaryLocation) summaryLocation.textContent = `📍 ${venue}, ${city}`;

    if (summaryDateTime) {
        if (isTba) {
            summaryDateTime.textContent = '📅 Date to be Announced (TBA)';
        } else {
            summaryDateTime.textContent = date ? `📅 ${date} ${time ? '@ ' + time : ''}` : '📅 Date not set';
        }
    }

    if (summaryDeadline) {
        if (deadline) {
            summaryDeadline.classList.remove('is-hidden');
            const d = new Date(deadline);
            summaryDeadline.textContent = `⏰ Deadline: ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            summaryDeadline.classList.add('is-hidden');
        }
    }

    if (summaryPrice) {
        summaryPrice.textContent = price === 0 ? '🎟️ Free' : `🎟️ NPR ${price.toLocaleString()}`;
    }
}

// Show the correct step pane and update controls
function goToStep(step) {
    for (let i = 1; i <= totalSteps; i++) {
        const pane = document.getElementById(`stepPane${i}`);
        if (pane) {
            if (i === step) {
                pane.classList.remove('is-hidden');
            } else {
                pane.classList.add('is-hidden');
            }
        }
    }
    stepIndicator.textContent = `Step ${step} of ${totalSteps}`;
    progressFill.className = `wizard-progress-fill progress-step-${step}`;
    if (step > 1) {
        btnBack.classList.remove('is-hidden');
    } else {
        btnBack.classList.add('is-hidden');
    }
    btnNext.textContent = step === totalSteps ? 'Publish Event' : 'Continue';
    currentStep = step;

    if (step === 3) {
        updateSummaryPreview();
    }
}

// Step validation
function validateStep(step) {
    if (step === 1) {
        const title = document.getElementById('eventTitle')?.value.trim();
        const desc = document.getElementById('eventDesc')?.value.trim();
        if (!title) {
            alert('Please enter an event title.');
            document.getElementById('eventTitle')?.focus();
            return false;
        }
        if (!desc) {
            alert('Please describe your event.');
            document.getElementById('eventDesc')?.focus();
            return false;
        }
        return true;
    }

    if (step === 2) {
        const city = document.getElementById('eventCity')?.value.trim();
        const venue = document.getElementById('eventVenue')?.value.trim();
        const isTba = document.getElementById('dateTBA')?.checked;
        const date = document.getElementById('eventDate')?.value;
        const time = document.getElementById('eventStartTime')?.value;
        const deadline = document.getElementById('registrationDeadline')?.value;
        const todayStr = new Date().toISOString().split('T')[0];

        if (!city) {
            alert('Please enter a city or region.');
            document.getElementById('eventCity')?.focus();
            return false;
        }
        if (!venue) {
            alert('Please enter the venue / address.');
            document.getElementById('eventVenue')?.focus();
            return false;
        }

        if (!isTba) {
            if (!date) {
                alert('Please select an event date.');
                document.getElementById('eventDate')?.focus();
                return false;
            }
            if (date < todayStr) {
                alert('Event date cannot be in the past.');
                document.getElementById('eventDate')?.focus();
                return false;
            }
            if (!time) {
                alert('Please specify the start time.');
                document.getElementById('eventStartTime')?.focus();
                return false;
            }
            if (deadline) {
                const eventDateTime = new Date(`${date}T${time}`);
                const deadlineTime = new Date(deadline);
                if (deadlineTime >= eventDateTime) {
                    alert('Registration deadline must be before the event date.');
                    document.getElementById('registrationDeadline')?.focus();
                    return false;
                }
            }
        }
        return true;
    }

    return true;
}

// Back button handler
btnBack.addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
});

// Next / Submit button handler
btnNext.addEventListener('click', async () => {
    if (currentStep < totalSteps) {
        if (validateStep(currentStep)) {
            goToStep(currentStep + 1);
        }
        return;
    }

    // Step 3 — Final submit
    if (!requireAuth()) return;

    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDesc').value.trim();
    const category = getSelectedCategory();
    const city = document.getElementById('eventCity').value.trim();
    const venue = document.getElementById('eventVenue').value.trim();
    const isTba = document.getElementById('dateTBA')?.checked || false;
    const eventDate = document.getElementById('eventDate')?.value;
    const startTime = document.getElementById('eventStartTime')?.value;
    const endTime = document.getElementById('eventEndTime')?.value || null;
    const deadline = document.getElementById('registrationDeadline')?.value || null;
    const isOnline = document.getElementById('eventIsOnline')?.checked || false;
    const price = parseFloat(document.getElementById('eventPrice').value) || 0;
    const capacityVal = document.getElementById('eventCapacity')?.value;
    const capacity = capacityVal ? parseInt(capacityVal, 10) : null;
    const todayStr = new Date().toISOString().split('T')[0];

    // Final validation
    if (!title || !description || !city || !venue) {
        alert('Please ensure all required fields are filled out.');
        return;
    }

    if (!isTba) {
        if (!eventDate) {
            alert('Please select an event date.');
            return;
        }
        if (eventDate < todayStr) {
            alert('Event date cannot be in the past.');
            return;
        }
        if (!startTime) {
            alert('Please specify the start time.');
            return;
        }
        if (deadline) {
            const eventDateTime = new Date(`${eventDate}T${startTime}`);
            const deadlineTime = new Date(deadline);
            if (deadlineTime >= eventDateTime) {
                alert('Registration deadline must be before the event date.');
                return;
            }
        }
    }

    btnNext.disabled = true;
    btnNext.textContent = 'Publishing...';

    // Construct FormData
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('city', city);
    formData.append('venue', venue);
    formData.append('is_date_tba', isTba ? 'true' : 'false');

    if (!isTba) {
        formData.append('event_date', eventDate);
        formData.append('start_time', startTime);
        if (endTime) formData.append('end_time', endTime);
        if (deadline) formData.append('registration_deadline', deadline);
    }

    formData.append('is_free', price === 0 ? 'true' : 'false');
    formData.append('min_price', price.toString());
    formData.append('currency', 'NPR');
    formData.append('is_online', isOnline ? 'true' : 'false');
    if (capacity) formData.append('capacity', capacity.toString());

    if (selectedBannerFile) {
        formData.append('eventBanner', selectedBannerFile);
    }

    try {
        const eventData = await createEvent(formData);

        if (!eventData.success) {
            if (eventData.message && eventData.message.toLowerCase().includes('authenticat')) {
                alert('Your session has expired. Please log in to publish your event.');
                clearAuth();
                window.location.href = 'login.html?redirect=create-event.html';
                return;
            }
            alert(eventData.message || 'Failed to create event.');
            btnNext.disabled = false;
            btnNext.textContent = 'Publish Event';
            return;
        }

        alert('Event published successfully!');
        window.location.href = 'explore.html';

    } catch (error) {
        console.error('Error creating event:', error);
        alert('Something went wrong. Please check your connection.');
        btnNext.disabled = false;
        btnNext.textContent = 'Publish Event';
    }
});

// Initialize on page load
if (requireAuth()) {
    goToStep(1);
}
