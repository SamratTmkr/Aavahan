import { isAuthenticated } from './authService.js';
import { checkinByCode } from './api.js';
import { showToast, escapeHtml } from './main.js';

// Reached two ways: an organiser scans a ticket QR with their phone camera
// (the QR is just a link to this page with ?code=...), or they type the code in.

const form = document.getElementById('checkinForm');
const input = document.getElementById('checkinCode');
const result = document.getElementById('checkinResult');

function showResult(state, title, detail) {
    const icon = { success: 'check_circle', warning: 'info', error: 'error' }[state] || 'error';

    result.hidden = false;
    result.className = `checkin-result checkin-result-${state}`;
    result.innerHTML = `
        <span class="material-symbols-outlined">${icon}</span>
        <div>
            <div class="checkin-result-title">${escapeHtml(title)}</div>
            ${detail ? `<div class="checkin-result-detail">${escapeHtml(detail)}</div>` : ''}
        </div>
    `;
}

async function submitCode(code) {
    if (!code) {
        showToast('Enter a ticket code.', 'info');
        return;
    }

    const btn = document.getElementById('btnCheckin');
    btn.disabled = true;
    btn.textContent = 'Checking in...';

    const res = await checkinByCode(code);

    if (res.success) {
        const name = res.data?.attendeeName || 'Attendee';
        const event = res.data?.eventTitle || '';
        if (res.alreadyCheckedIn) {
            showResult('warning', `${name} was already checked in`, event);
        } else {
            showResult('success', `${name} checked in`, event);
        }
        input.value = '';
    } else {
        showResult('error', res.message || 'Check-in failed', '');
    }

    btn.disabled = false;
    btn.textContent = 'Check in';
    input.focus();
}

// An organiser must be logged in before any of this works
if (!isAuthenticated()) {
    const back = window.location.pathname + window.location.search;
    window.location.href = 'login.html?redirect=' + encodeURIComponent(back);
} else {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitCode(input.value.trim().toUpperCase());
    });

    // Came in from a scanned QR: check that code straight away
    const codeFromQr = new URLSearchParams(window.location.search).get('code');
    if (codeFromQr) {
        input.value = codeFromQr.toUpperCase();
        submitCode(codeFromQr.trim().toUpperCase());
    }
}
