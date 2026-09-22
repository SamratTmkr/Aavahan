import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../utils/email.js';

// Event titles, names and comments are written by users and then dropped into
// HTML. These tests exist because that was a live stored-XSS hole.

describe('escapeHtml', () => {
    test('neutralises a script tag', () => {
        assert.equal(
            escapeHtml('<script>alert(1)</script>'),
            '&lt;script&gt;alert(1)&lt;/script&gt;'
        );
    });

    test('neutralises an image onerror payload', () => {
        const out = escapeHtml('<img src=x onerror="steal()">');
        assert.ok(!out.includes('<img'), 'a raw tag survived escaping');
        assert.ok(out.includes('&lt;img'));
    });

    test('escapes the ampersand first, so entities are not double-decoded', () => {
        assert.equal(escapeHtml('&lt;'), '&amp;lt;');
    });

    test('escapes quotes, so a value cannot break out of an attribute', () => {
        assert.equal(escapeHtml('" onmouseover="x'), '&quot; onmouseover=&quot;x');
    });

    test('leaves ordinary text untouched', () => {
        assert.equal(escapeHtml('Pokhara Sunrise Trail Run'), 'Pokhara Sunrise Trail Run');
    });

    test('handles null, undefined and numbers without throwing', () => {
        assert.equal(escapeHtml(null), '');
        assert.equal(escapeHtml(undefined), '');
        assert.equal(escapeHtml(42), '42');
    });
});
