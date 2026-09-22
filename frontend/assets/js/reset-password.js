import { requestPasswordReset, resetPassword } from './api.js';
import { showToast } from './main.js';

// One page, two jobs. Arriving with ?token=... means the user followed the
// emailed link, so show the "choose a new password" form instead.
const token = new URLSearchParams(window.location.search).get('token');

const requestForm = document.getElementById('requestResetForm');
const passwordForm = document.getElementById('newPasswordForm');
const doneMessage = document.getElementById('resetDoneMessage');
const heading = document.getElementById('resetHeading');

if (token) {
    requestForm.hidden = true;
    passwordForm.hidden = false;
    heading.textContent = 'Choose a new password';
}

requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('resetEmail').value.trim();
    const btn = document.getElementById('btnRequestReset');

    btn.disabled = true;
    btn.textContent = 'Sending...';

    const res = await requestPasswordReset(email);

    if (res.success) {
        requestForm.hidden = true;
        doneMessage.hidden = false;
        doneMessage.textContent = res.message;
        showToast('Check your email for the reset link', 'success');
    } else {
        showToast(res.message || 'Could not send the reset link.', 'error');
        btn.disabled = false;
        btn.textContent = 'Send reset link';
    }
});

passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('btnSetPassword');

    if (password !== confirm) {
        showToast('The two passwords do not match.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Updating...';

    const res = await resetPassword(token, password);

    if (res.success) {
        passwordForm.hidden = true;
        doneMessage.hidden = false;
        doneMessage.textContent = 'Password updated. Taking you to the login page...';
        showToast('Password updated', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } else {
        showToast(res.message || 'Could not update your password.', 'error');
        btn.disabled = false;
        btn.textContent = 'Update password';
    }
});
