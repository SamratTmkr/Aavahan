import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, isStrongPassword, normaliseEmail, PASSWORD_REQUIREMENTS } from '../utils/validators.js';

describe('normaliseEmail', () => {
    test('trims surrounding whitespace', () => {
        assert.equal(normaliseEmail('  user@aavahan.com  '), 'user@aavahan.com');
    });

    test('lowercases, so one address cannot become two accounts', () => {
        assert.equal(normaliseEmail('User@Example.COM'), 'user@example.com');
    });

    test('survives null and undefined', () => {
        assert.equal(normaliseEmail(null), '');
        assert.equal(normaliseEmail(undefined), '');
    });
});

describe('isValidEmail', () => {
    for (const good of ['user@aavahan.com', 'a.b+tag@sub.domain.np', '  Mixed@Case.Com  ']) {
        test(`accepts ${JSON.stringify(good)}`, () => assert.equal(isValidEmail(good), true));
    }

    for (const bad of ['notanemail', 'missing@tld', '@nouser.com', 'spaces in@email.com', '', null]) {
        test(`rejects ${JSON.stringify(bad)}`, () => assert.equal(isValidEmail(bad), false));
    }
});

describe('isStrongPassword', () => {
    test('accepts a password with upper, lower, digit and 6+ characters', () => {
        assert.equal(isStrongPassword('Passw0rd'), true);
        assert.equal(isStrongPassword('Ab3xyz'), true);
    });

    test('rejects an all-lowercase password', () => {
        assert.equal(isStrongPassword('password'), false);
    });

    test('rejects a password with no digit', () => {
        assert.equal(isStrongPassword('Password'), false);
    });

    test('rejects a password with no uppercase', () => {
        assert.equal(isStrongPassword('passw0rd'), false);
    });

    test('rejects anything shorter than 6 characters', () => {
        assert.equal(isStrongPassword('Ab3x'), false);
    });

    test('rejects non-strings', () => {
        assert.equal(isStrongPassword(null), false);
        assert.equal(isStrongPassword(12345678), false);
    });

    test('sign-up and password reset share one rule', () => {
        assert.match(PASSWORD_REQUIREMENTS, /6 characters/);
    });
});
