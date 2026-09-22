import crypto from 'crypto';

// Codes are read off a phone screen and sometimes typed in by hand, so the
// alphabet leaves out 0/O and 1/I. Eight characters from 32 symbols is enough
// that a code cannot realistically be guessed.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;

export const makeCheckinCode = () =>
    Array.from(crypto.randomBytes(CODE_LENGTH))
        .map(byte => CODE_ALPHABET[byte % CODE_ALPHABET.length])
        .join('');
