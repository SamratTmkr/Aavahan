import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhone, phoneError } from '../utils/phone.js';

describe('formatPhone', () => {
    test('accepts a code the user typed, with or without a plus', () => {
        assert.equal(formatPhone('977', '9812345678'), '+977 9812345678');
        assert.equal(formatPhone('+977', '9812345678'), '+977 9812345678');
    });

    test('accepts any country code, not only a fixed list', () => {
        assert.equal(formatPhone('+49', '15123456789'), '+49 15123456789');
        assert.equal(formatPhone('+1', '4155552671'), '+1 4155552671');
    });

    test('strips spaces and dashes from the number', () => {
        assert.equal(formatPhone('+977', '981-234 5678'), '+977 9812345678');
    });

    test('rejects a missing or too long country code', () => {
        assert.equal(formatPhone('', '9812345678'), null);
        assert.equal(formatPhone('+9771', '9812345678'), null);
        assert.equal(formatPhone('+97a', '9812345678'), null);
    });

    test('rejects numbers that are too short, too long, or not digits', () => {
        assert.equal(formatPhone('+977', '12345'), null);
        assert.equal(formatPhone('+977', '981234567890123'), null);
        assert.equal(formatPhone('+977', '98123abcde'), null);
    });

    test('rejects a code and number longer than 15 digits together', () => {
        assert.equal(formatPhone('+977', '981234567890'), '+977 981234567890');
        assert.equal(formatPhone('+977', '9812345678901'), null);
    });
});

describe('phoneError', () => {
    test('is empty for a valid number', () => {
        assert.equal(phoneError('+977', '9812345678'), '');
    });

    test('asks for a country code when it is missing', () => {
        assert.equal(phoneError('', '9812345678'), 'Please enter a country code, like +977');
    });

    test('explains when the number has letters', () => {
        assert.equal(phoneError('+977', '98abc'), 'Phone numbers can only contain digits');
    });
});
