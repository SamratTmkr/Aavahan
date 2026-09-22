// Shared input rules. These live here rather than inline in the controllers so
// sign-up and password reset cannot drift apart, and so they can be tested
// without a database or a running server.

// Deliberately permissive: something@something.something. Real delivery is
// proven by the confirmation email, not by a clever regular expression.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// At least 6 characters, with a lowercase letter, an uppercase letter and a digit
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

export const PASSWORD_REQUIREMENTS =
    'Password must be at least 6 characters and contain uppercase, lowercase, and a number';

// Trimmed and lowercased, so User@Example.com and user@example.com are one account
export const normaliseEmail = (email) => String(email ?? '').trim().toLowerCase();

export const isValidEmail = (email) => EMAIL_PATTERN.test(normaliseEmail(email));

export const isStrongPassword = (password) =>
    typeof password === 'string' && PASSWORD_PATTERN.test(password);
