// Event Creation Wizard State
let currentStep = 1;
const totalSteps = 3;

const btnNext = document.getElementById('btnWizardNext');
const btnBack = document.getElementById('btnWizardBack');
const stepIndicator = document.getElementById('wizardStepIndicator');
const progressFill = document.getElementById('wizardProgressFill');

// Check authentication on page load
function requireAuth() {
    const token = localStorage.getItem('aavahan_token') || sessionStorage.getItem('aavahan_token');
    if (!token) {
        alert('You must be logged in to create an event. Redirecting to login...');
        const isSubfolder = window.location.pathname.includes('/pages/');
        window.location.href = isSubfolder ? 'login.html?redirect=create-event.html' : 'pages/login.html?redirect=create-event.html';
        return false;
    }
    return true;
}

// Category tag pill selector (single select)
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

// Update live summary preview for Step 3
function updateSummaryPreview() {
    const title = document.getElementById('eventTitle')?.value.trim() || 'Untitled Event';
    const category = getSelectedCategory();
    const city = document.getElementById('eventCity')?.value.trim() || 'Kathmandu, Nepal';
    const venue = document.getElementById('eventVenue')?.value.trim() || 'Venue TBD';
    const date = document.getElementById('eventDate')?.value;
    const time = document.getElementById('eventStartTime')?.value || '';
    const price = parseFloat(document.getElementById('eventPrice')?.value) || 0;

    const summaryTitle = document.getElementById('summaryTitle');
    const summaryCategory = document.getElementById('summaryCategory');
    const summaryLocation = document.getElementById('summaryLocation');
    const summaryDateTime = document.getElementById('summaryDateTime');
    const summaryPrice = document.getElementById('summaryPrice');

    if (summaryTitle) summaryTitle.textContent = title;
    if (summaryCategory) summaryCategory.textContent = `📂 ${category}`;
    if (summaryLocation) summaryLocation.textContent = `📍 ${venue}, ${city}`;
    if (summaryDateTime) summaryDateTime.textContent = date ? `📅 ${date} ${time ? '@ ' + time : ''}` : '📅 Date not set';
    if (summaryPrice) {
        summaryPrice.textContent = price === 0 ? '🎟️ Free' : `🎟️ NPR ${price.toLocaleString()}`;
    }
}

// Show the correct step pane and update controls
function goToStep(step) {
    for (let i = 1; i <= totalSteps; i++) {
        const pane = document.getElementById(`stepPane${i}`);
        if (pane) pane.style.display = i === step ? '' : 'none';
    }
    stepIndicator.textContent = `Step ${step} of ${totalSteps}`;
    progressFill.style.width = `${(step / totalSteps) * 100}%`;
    btnBack.style.display = step > 1 ? '' : 'none';
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
        const date = document.getElementById('eventDate')?.value;
        const time = document.getElementById('eventStartTime')?.value;

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
        if (!date) {
            alert('Please select an event date.');
            document.getElementById('eventDate')?.focus();
            return false;
        }
        if (!time) {
            alert('Please specify the start time.');
            document.getElementById('eventStartTime')?.focus();
            return false;
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

    const title       = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDesc').value.trim();
    const category    = getSelectedCategory();
    const city        = document.getElementById('eventCity').value.trim();
    const venue       = document.getElementById('eventVenue').value.trim();
    const eventDate   = document.getElementById('eventDate').value;
    const startTime   = document.getElementById('eventStartTime').value;
    const endTime     = document.getElementById('eventEndTime')?.value || null;
    const isOnline    = document.getElementById('eventIsOnline')?.checked || false;
    const price       = parseFloat(document.getElementById('eventPrice').value) || 0;
    const capacityVal = document.getElementById('eventCapacity')?.value;
    const capacity    = capacityVal ? parseInt(capacityVal, 10) : null;

    if (!title || !description || !city || !venue || !eventDate || !startTime) {
        alert('Please ensure all required fields are filled out.');
        return;
    }

    btnNext.disabled = true;
    btnNext.textContent = 'Publishing...';

    try {
        const eventData = await createEvent({
            title,
            description,
            category,
            city,
            venue,
            event_date: eventDate,
            start_time: startTime,
            end_time: endTime || null,
            is_free: price === 0,
            min_price: price,
            currency: 'NPR',
            is_online: isOnline,
            capacity: capacity,
        });

        if (!eventData.success) {
            if (eventData.message && eventData.message.toLowerCase().includes('authenticat')) {
                alert('Your session has expired. Please log in to publish your event.');
                localStorage.removeItem('aavahan_token');
                sessionStorage.removeItem('aavahan_token');
                sessionStorage.removeItem('aavahan_logged_in');
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

// Set default event date to 1 week from today
function setDefaultDate() {
    const dateInput = document.getElementById('eventDate');
    if (dateInput && !dateInput.value) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        dateInput.value = nextWeek.toISOString().split('T')[0];
    }
}

// Initialize on page load
if (requireAuth()) {
    setDefaultDate();
    goToStep(1);
}
