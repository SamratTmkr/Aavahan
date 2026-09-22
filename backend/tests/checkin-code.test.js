import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeCheckinCode, CODE_ALPHABET, CODE_LENGTH } from '../utils/checkin-code.js';

describe('makeCheckinCode', () => {
    test('is always 8 characters', () => {
        for (let i = 0; i < 200; i++) {
            assert.equal(makeCheckinCode().length, CODE_LENGTH);
        }
    });

    test('only uses characters from the agreed alphabet', () => {
        for (let i = 0; i < 200; i++) {
            for (const ch of makeCheckinCode()) {
                assert.ok(CODE_ALPHABET.includes(ch), `unexpected character ${ch}`);
            }
        }
    });

    test('never contains characters that are easy to misread', () => {
        const ambiguous = ['0', 'O', '1', 'I'];
        for (let i = 0; i < 200; i++) {
            const code = makeCheckinCode();
            for (const ch of ambiguous) {
                assert.ok(!code.includes(ch), `${code} contains the ambiguous character ${ch}`);
            }
        }
    });

    test('does not repeat itself across a large batch', () => {
        const codes = new Set();
        for (let i = 0; i < 5000; i++) codes.add(makeCheckinCode());
        assert.equal(codes.size, 5000, 'generated a duplicate check-in code');
    });

    test('is not guessable by counting: two codes in a row differ', () => {
        assert.notEqual(makeCheckinCode(), makeCheckinCode());
    });
});
