import { isAuthenticated } from './authService.js';
import { checkinByCode } from './api.js';
import { showToast, escapeHtml } from './main.js';

// Reached two ways: an organiser scans a ticket QR with their phone camera
// (the QR is just a link to this page with ?code=...), or they type the code in.

const form = document.getElementById('checkinForm');
const input = document.getElementById('checkinCode');
const result = document.getElementById('checkinResult');

function showResult(state, title, detail) {
    const colours = {
        success: ['#f0fdfa', '#0f766e', 'check_circle'],
        warning: ['#fffbeb', '#b45309', 'info'],
        error: ['#fef2f2', '#b91c1c', 'error']
    };
    const [bg, fg, icon] = colours[state] || colours.error;

    result.hidden = false;
    result.style.cssText = `background:${bg};border:1px solid ${fg};color:${fg};border-radius:10px;padding:16px;margin-bottom:20px;`;
    result.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start;">
            <span class="material-symbols-outlined">${icon}</span>
            <div>
                <strong>${escapeHtml(title)}</strong>
                ${detail ? `<div style="font-size:13px;margin-top:2px;">${escapeHtml(detail)}</div>` : ''}
            </div>
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
