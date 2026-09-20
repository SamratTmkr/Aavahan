import { getEvents, getEventCities } from './api.js';

// events.js

document.addEventListener('DOMContentLoaded', () => {
    const feedContainer  = document.getElementById('meetupEventsFeedSection');
    const countEl        = document.getElementById('feedResultsCount');
    const searchInput    = document.getElementById('meetupSearchInput');
    const filterCity     = document.getElementById('filterCitySelect');
    const filterCategory = document.getElementById('filterCategorySelect');
    const filterType     = document.getElementById('filterTypeSelect');
    const filterDay      = document.getElementById('filterDaySelect');
    const filterSort     = document.getElementById('filterSortSelect');

    let allEvents   = [];
    let debounceTimer = null;

    // Read URL params and pre-fill controls
    const urlParams    = new URLSearchParams(window.location.search);
    const initSearch   = urlParams.get('search')   || '';
    const initCity     = urlParams.get('city')      || '';
    const initCategory = urlParams.get('category')  || '';

    if (searchInput && initSearch)       searchInput.value = initSearch;
    if (filterCity  && initCity)         setSelectByValue(filterCity,     initCity);
    if (filterCategory && initCategory)  setSelectByValue(filterCategory, initCategory);

    function setSelectByValue(select, value) {
        if (!value) return;
        const valLower = value.toLowerCase().trim();
        const baseVal = valLower.split(',')[0].trim();
        for (const opt of select.options) {
            const optLower = opt.value.toLowerCase();
            if (optLower === valLower || optLower === baseVal || valLower.includes(optLower)) {
                select.value = opt.value;
                break;
            }
        }
    }

    // Date helpers
    function formatDate(dateStr, timeStr, isTba) {
        if (isTba || !dateStr) return 'Date TBA';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Date TBA';
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        let formatted = d.toLocaleDateString('en-US', options);
        if (timeStr) formatted += ' · ' + timeStr.slice(0, 5);
        return formatted;
    }

    function isToday(dateStr) {
        const d = new Date(dateStr), t = new Date();
        return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    }

    function isTomorrow(dateStr) {
        const d = new Date(dateStr), t = new Date();
        t.setDate(t.getDate() + 1);
        return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    }

    function isThisWeekend(dateStr) {
        const d = new Date(dateStr), now = new Date();
        const diffToSat = (6 - now.getDay() + 7) % 7;
        const sat = new Date(now); sat.setDate(now.getDate() + diffToSat);
        const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
        return d.toDateString() === sat.toDateString() || d.toDateString() === sun.toDateString();
    }

    function isNextWeek(dateStr) {
        const d = new Date(dateStr), now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() + (7 - now.getDay() + 1));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
    }

    // Render events list
    function renderEvents(events) {
        if (!feedContainer) return;

        if (events.length === 0) {
            feedContainer.innerHTML =
                '<div class="event-feed-empty-state">' +
                '<span class="material-symbols-outlined event-feed-empty-icon">search_off</span>' +
                '<h3 class="event-feed-empty-title">No events found</h3>' +
                '<p class="event-feed-empty-desc">Try adjusting your search terms or filters — or be the first to host an event!</p>' +
                '<a href="create-event.html" class="btn btn-primary btn-pill">Start an Event</a>' +
                '</div>';
            if (countEl) countEl.textContent = '0 events found';
            return;
        }

        if (countEl) {
            countEl.textContent = 'Showing ' + events.length + ' event' + (events.length === 1 ? '' : 's');
        }

        feedContainer.innerHTML = '<div class="event-feed-list">' +
            events.map(function(event) {
                const priceBadge = (event.is_free || !event.min_price || event.min_price == 0)
                    ? '<span class="badge event-badge-free">FREE</span>'
                    : '<span class="badge event-badge-paid">NPR ' + Number(event.min_price).toLocaleString() + '</span>';

                const onlineBadge = event.is_online
                    ? '<span class="badge event-badge-online">Online</span>'
                    : '';

                const attendeesBit = event.attendee_count
                    ? '<span class="event-feed-meta-item"><span class="material-symbols-outlined event-feed-meta-icon">group</span>' + event.attendee_count + ' going</span>'
                    : '';

                const capacityBit = event.capacity
                    ? '<span class="event-feed-capacity"><span class="material-symbols-outlined event-feed-meta-icon-muted">chair</span>Limit: ' + event.capacity + '</span>'
                    : '';

                return '<div class="card event-feed-card" data-event-id="' + event.id + '">' +
                    '<div class="event-feed-top">' +
                        '<div class="flex-1">' +
                            '<div class="event-feed-category">' +
                                (event.category || 'General') +
                            '</div>' +
                            '<h2 class="event-feed-title">' +
                                event.title +
                            '</h2>' +
                        '</div>' +
                        '<div class="top-actions-wrap">' +
                            onlineBadge + priceBadge +
                        '</div>' +
                    '</div>' +

                    '<p class="event-feed-desc">' +
                        (event.description || 'No description provided.') +
                    '</p>' +

                    '<div class="event-feed-meta">' +
                        '<span class="event-feed-meta-item">' +
                            '<span class="material-symbols-outlined event-feed-meta-icon">calendar_today</span>' +
                            formatDate(event.event_date, event.start_time, event.is_date_tba) +
                        '</span>' +
                        '<span class="event-feed-meta-item">' +
                            '<span class="material-symbols-outlined event-feed-meta-icon">' + (event.is_online ? 'videocam' : 'location_on') + '</span>' +
                            (event.is_online ? 'Online Event' : (event.venue || event.city || 'Location TBD')) +
                        '</span>' +
                        attendeesBit + capacityBit +
                    '</div>' +
                    '</div>';
            }).join('') +
        '</div>';
    }

    // Client-side filter and sort
    function applyLocalFilters() {
        const category = filterCategory ? filterCategory.value : 'all';
        const type     = filterType     ? filterType.value     : 'all';
        const day      = filterDay      ? filterDay.value      : 'all';
        const sort     = filterSort     ? filterSort.value     : 'date';

        let filtered = allEvents.filter(function(event) {
            if (category !== 'all' && event.category) {
                if (event.category.toLowerCase().indexOf(category.toLowerCase()) === -1) return false;
            }
            if (type === 'online'    && !event.is_online) return false;
            if (type === 'in-person' &&  event.is_online) return false;
            if (day === 'today'    && !isToday(event.event_date))       return false;
            if (day === 'tomorrow' && !isTomorrow(event.event_date))    return false;
            if (day === 'weekend'  && !isThisWeekend(event.event_date)) return false;
            if (day === 'week'     && !isNextWeek(event.event_date))    return false;
            return true;
        });

        if (sort === 'price-low') {
            filtered.sort(function(a, b) { return Number(a.min_price || 0) - Number(b.min_price || 0); });
        } else if (sort === 'price-high') {
            filtered.sort(function(a, b) { return Number(b.min_price || 0) - Number(a.min_price || 0); });
        } else {
            filtered.sort(function(a, b) {
                if (a.is_date_tba && !b.is_date_tba) return 1;
                if (!a.is_date_tba && b.is_date_tba) return -1;
                return new Date(a.event_date) - new Date(b.event_date);
            });
        }

        renderEvents(filtered);
        updateActiveFiltersBar();
    }

    // Active filters bar
    function updateActiveFiltersBar() {
        var bar = document.getElementById('activeFiltersBar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'activeFiltersBar';
            bar.className = 'active-filters-bar';
            if (feedContainer && feedContainer.parentNode) {
                feedContainer.parentNode.insertBefore(bar, feedContainer);
            }
        }

        var active = [];
        var q = searchInput ? searchInput.value.trim() : '';
        if (q) active.push({ label: '"' + q + '"', clear: function() { searchInput.value = ''; triggerServerSearch(); } });

        if (filterCity && filterCity.value && filterCity.value !== 'all') {
            var cityLabel = filterCity.options[filterCity.selectedIndex] ? filterCity.options[filterCity.selectedIndex].text : filterCity.value;
            active.push({ label: cityLabel, clear: function() { filterCity.value = 'all'; triggerServerSearch(); } });
        }
        if (filterCategory && filterCategory.value && filterCategory.value !== 'all') {
            var catLabel = filterCategory.options[filterCategory.selectedIndex] ? filterCategory.options[filterCategory.selectedIndex].text : filterCategory.value;
            active.push({ label: catLabel, clear: function() { filterCategory.value = 'all'; applyLocalFilters(); } });
        }
        if (filterType && filterType.value && filterType.value !== 'all') {
            var typeLabel = filterType.options[filterType.selectedIndex] ? filterType.options[filterType.selectedIndex].text : filterType.value;
            active.push({ label: typeLabel, clear: function() { filterType.value = 'all'; applyLocalFilters(); } });
        }
        if (filterDay && filterDay.value && filterDay.value !== 'all') {
            var dayLabel = filterDay.options[filterDay.selectedIndex] ? filterDay.options[filterDay.selectedIndex].text : filterDay.value;
            active.push({ label: dayLabel, clear: function() { filterDay.value = 'all'; applyLocalFilters(); } });
        }

        if (active.length === 0) { bar.innerHTML = ''; return; }

        var chipsHTML = active.map(function(f, i) {
            return '<button data-filter-idx="' + i + '" class="active-filter-chip">' +
                f.label +
                '<span class="material-symbols-outlined fs-13">close</span>' +
                '</button>';
        }).join('');

        bar.innerHTML =
            '<span class="active-filters-label">Active filters:</span>' +
            chipsHTML +
            '<button id="clearAllFiltersBtn" class="active-filters-clear-btn">Clear all</button>';

        bar.querySelectorAll('.active-filter-chip').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(btn.getAttribute('data-filter-idx'), 10);
                if (active[idx]) active[idx].clear();
            });
        });

        var clearAllBtn = bar.querySelector('#clearAllFiltersBtn');
        if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllFilters);
    }

    function clearAllFilters() {
        if (searchInput)    searchInput.value = '';
        if (filterCity)     filterCity.value = 'all';
        if (filterCategory) filterCategory.value = 'all';
        if (filterType)     filterType.value = 'all';
        if (filterDay)      filterDay.value = 'all';
        triggerServerSearch();
    }

    // Server-side fetch
    async function fetchAndRender() {
        var query = searchInput ? searchInput.value.trim() : '';
        var city  = (filterCity && filterCity.value !== 'all') ? filterCity.value : null;

        if (countEl) countEl.textContent = '';

        try {
            var data = await getEvents(city, query || null);
            if (data && data.success && Array.isArray(data.data)) {
                allEvents = data.data;
            } else if (Array.isArray(data)) {
                allEvents = data;
            } else {
                allEvents = [];
            }
            applyLocalFilters();
        } catch (error) {
            console.error('Error fetching events:', error);
            if (feedContainer) {
                feedContainer.innerHTML =
                    '<div class="event-feed-empty-state">' +
                    '<span class="material-symbols-outlined event-feed-empty-icon fs-40">cloud_off</span>' +
                    '<p>Could not load events. Please check that the server is running.</p>' +
                    '</div>';
            }
            if (countEl) countEl.textContent = '';
        }
    }

    function triggerServerSearch() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchAndRender, 350);
    }

    // Event listeners
    if (searchInput)    searchInput.addEventListener('input',  triggerServerSearch);
    if (filterCity)     filterCity.addEventListener('change',  fetchAndRender);
    if (filterCategory) filterCategory.addEventListener('change', applyLocalFilters);
    if (filterType)     filterType.addEventListener('change',     applyLocalFilters);
    if (filterDay)      filterDay.addEventListener('change',      applyLocalFilters);
    if (filterSort)     filterSort.addEventListener('change',     applyLocalFilters);
    async function populateCityFilter() {
        if (!filterCity) return;
        try {
            if (typeof getEventCities === 'function') {
                const res = await getEventCities();
                if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                    const currentVal = filterCity.value;
                    filterCity.innerHTML = '<option value="all">All Locations</option>';
                    res.data.forEach(function(item) {
                        if (item.city && item.city.trim()) {
                            const opt = document.createElement('option');
                            opt.value = item.city.trim();
                            opt.textContent = item.city.trim() + ' (' + item.count + ')';
                            filterCity.appendChild(opt);
                        }
                    });
                    if (currentVal && currentVal !== 'all') filterCity.value = currentVal;
                    if (initCity) setSelectByValue(filterCity, initCity);
                }
            }
        } catch (e) {
            console.log('Could not dynamically load cities:', e);
        }
    }

    // Delegated click handler for event cards
    if (feedContainer) {
        feedContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.event-feed-card[data-event-id]');
            if (card) {
                const eventId = card.getAttribute('data-event-id');
                window.location.href = `event-details.html?id=${eventId}`;
            }
        });
    }

    // Initial load
    populateCityFilter();
    fetchAndRender();
});
