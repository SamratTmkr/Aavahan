// People type their own country code, so the check follows the international
// format: a 1-3 digit code, a 6-14 digit number, at most 15 digits together.
// Keep in sync with frontend/assets/js/phone.js.

const cleanCode = (code) => String(code || '').trim().replace(/^\+/, '');
const cleanNumber = (number) => String(number || '').replace(/[\s-]/g, '');

// Returns an error message, or '' when the code and number are valid
export const phoneError = (code, number) => {
    const c = cleanCode(code);
    const n = cleanNumber(number);

    if (!/^\d{1,3}$/.test(c)) return 'Please enter a country code, like +977';
    if (!/^\d+$/.test(n)) return 'Phone numbers can only contain digits';
    if (n.length < 6 || n.length > 14 || c.length + n.length > 15) {
        return 'Please enter a valid phone number';
    }
    return '';
};

// Returns the number as "+977 9812345678", or null if it is not valid
export const formatPhone = (code, number) => {
    if (phoneError(code, number)) return null;
    return `+${cleanCode(code)} ${cleanNumber(number)}`;
};
