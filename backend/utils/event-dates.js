// An event is over once its last day has passed. Multi-day events end on
// end_date, single-day events on event_date. Events with no date yet (TBA)
// are never over.
export const isEventPast = (event, today = new Date()) => {
    const lastDay = event.end_date || event.event_date;
    if (!lastDay) return false;
    return new Date(lastDay).toISOString().slice(0, 10) < today.toISOString().slice(0, 10);
};

export const PAST_EVENT_MESSAGE = 'This event has ended. Past events can be viewed but not changed.';
