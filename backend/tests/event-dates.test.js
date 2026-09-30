import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isEventPast } from '../utils/event-dates.js';

const today = new Date('2026-09-28T10:00:00Z');

describe('isEventPast', () => {
    test('an event yesterday is past', () => {
        assert.equal(isEventPast({ event_date: new Date('2026-09-27') }, today), true);
    });

    test('an event today is not past', () => {
        assert.equal(isEventPast({ event_date: new Date('2026-09-28') }, today), false);
    });

    test('a multi-day event still running is not past', () => {
        assert.equal(isEventPast({ event_date: new Date('2026-09-25'), end_date: new Date('2026-09-29') }, today), false);
    });

    test('a multi-day event that finished yesterday is past', () => {
        assert.equal(isEventPast({ event_date: new Date('2026-09-20'), end_date: new Date('2026-09-27') }, today), true);
    });

    test('an event with no date yet is not past', () => {
        assert.equal(isEventPast({ event_date: null, end_date: null }, today), false);
    });
});
