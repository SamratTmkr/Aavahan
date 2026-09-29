// People type their own country code, so the check follows the international
// format: a 1-3 digit code, a 6-14 digit number, at most 15 digits together.
// Keep in sync with backend/utils/phone.js.

// Returns an error message, or '' when the code and number are valid
export function phoneProblem(code, number) {
    const c = String(code || '').trim().replace(/^\+/, '');
    const n = String(number || '').replace(/[\s-]/g, '');

    if (!/^\d{1,3}$/.test(c)) return 'Please enter a country code, like +977.';
    if (!/^\d+$/.test(n)) return 'Phone numbers can only contain digits.';
    if (n.length < 6 || n.length > 14 || c.length + n.length > 15) {
        return 'Please enter a valid phone number.';
    }
    return '';
}

// Split a stored "+977 9812345678" back into its code and number
export function splitPhone(phone) {
    const match = /^\+(\d+) (\d+)$/.exec(phone || '');
    return match ? { code: '+' + match[1], number: match[2] } : { code: '', number: '' };
}
