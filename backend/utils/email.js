import 'dotenv/config';

// Email goes through the Mailtrap sandbox, which captures messages in an inbox
// instead of delivering them to real people. Nothing here throws: a failed
// email must never fail the request that triggered it.

const TOKEN = process.env.MAILTRAP_TOKEN;
const INBOX_ID = process.env.MAILTRAP_INBOX_ID;
const FROM_EMAIL = process.env.MAIL_FROM || 'no-reply@aavahan.test';
const FROM_NAME = process.env.MAIL_FROM_NAME || 'Aavahan';

// Values come from user input (event titles, names), so escape before
// dropping them into the HTML body.
export const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const isEmailConfigured = () => Boolean(TOKEN && INBOX_ID);

export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mailtrap's free sandbox accepts only a trickle of mail, so a rejected send is
// retried a few times with a growing pause before we give up.
const RETRY_DELAYS_MS = [2000, 5000, 10000];

export const sendEmail = async ({ to, subject, html, text }, attempt = 0) => {
    if (!isEmailConfigured()) {
        console.log(`Email skipped (MAILTRAP_TOKEN / MAILTRAP_INBOX_ID not set): "${subject}" to ${to}`);
        return false;
    }

    try {
        const res = await fetch(`https://sandbox.api.mailtrap.io/api/send/${INBOX_ID}`, {
            method: 'POST',
            headers: { 'Api-Token': TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: { email: FROM_EMAIL, name: FROM_NAME },
                to: [{ email: to }],
                subject,
                text,
                html
            })
        });

        if (res.status === 429 && attempt < RETRY_DELAYS_MS.length) {
            await wait(RETRY_DELAYS_MS[attempt]);
            return sendEmail({ to, subject, html, text }, attempt + 1);
        }

        if (!res.ok) {
            console.error(`Email to ${to} rejected by Mailtrap (${res.status}) after ${attempt + 1} attempt(s):`, (await res.text()).slice(0, 120));
            return false;
        }

        console.log(`Email sent to ${to}: ${subject}`);
        return true;
    } catch (error) {
        console.error(`Email to ${to} failed:`, error.message);
        return false;
    }
};

// Shared wrapper so every message looks the same
const layout = (heading, bodyHtml) => `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; max-width: 560px;">
        <h2 style="color: #0f766e; margin-bottom: 4px;">Aavahan</h2>
        <h3 style="margin-top: 0;">${heading}</h3>
        ${bodyHtml}
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            You are receiving this because you registered for an event on Aavahan.
        </p>
    </div>
`;

export const sendRegistrationConfirmation = async ({ to, userName, event }) => {
    const title = escapeHtml(event.title);
    const when = event.is_date_tba || !event.event_date
        ? 'Date to be announced — the organiser will confirm it here'
        : escapeHtml(`${new Date(event.event_date).toDateString()}${event.start_time ? ' at ' + String(event.start_time).slice(0, 5) : ''}`);
    const where = escapeHtml(event.is_online ? 'Online event' : (event.venue || event.city || 'Venue to be confirmed'));

    return sendEmail({
        to,
        subject: `You are registered for ${event.title}`,
        text: `Hi ${userName}, your place at ${event.title} is confirmed.\nWhen: ${when}\nWhere: ${where}`,
        html: layout(`You are registered for ${title}`, `
            <p>Hi ${escapeHtml(userName)}, your place is confirmed.</p>
            <p><strong>When:</strong> ${when}<br>
               <strong>Where:</strong> ${where}</p>
            <p>You can cancel any time from <strong>My Activities</strong>.</p>
        `)
    });
};

export const sendAnnouncementEmail = async ({ to, userName, eventTitle, title, message }) => {
    return sendEmail({
        to,
        subject: `Update for ${eventTitle}: ${title}`,
        text: `Hi ${userName}, the organiser of ${eventTitle} posted an update.\n\n${title}\n\n${message}`,
        html: layout(`Update for ${escapeHtml(eventTitle)}`, `
            <p>Hi ${escapeHtml(userName)}, the organiser posted an update.</p>
            <p style="border-left: 3px solid #0f766e; padding-left: 12px;">
                <strong>${escapeHtml(title)}</strong><br>
                ${escapeHtml(message).replace(/\n/g, '<br>')}
            </p>
        `)
    });
};

export const sendPasswordResetEmail = async ({ to, userName, resetUrl }) => {
    return sendEmail({
        to,
        subject: 'Reset your Aavahan password',
        text: `Hi ${userName}, open this link to choose a new password. It expires in one hour.

${resetUrl}

If you did not ask for this, ignore this email — your password will not change.`,
        html: layout('Reset your password', `
            <p>Hi ${escapeHtml(userName)}, use the link below to choose a new password. It expires in one hour.</p>
            <p><a href="${escapeHtml(resetUrl)}" style="background:#0f766e;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Choose a new password</a></p>
            <p style="font-size:12px;color:#64748b;">Or paste this into your browser:<br>${escapeHtml(resetUrl)}</p>
            <p>If you did not ask for this, ignore this email — your password will not change.</p>
        `)
    });
};
