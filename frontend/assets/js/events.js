import { escapeHtml } from './main.js';
import { getEvents, getEventCities } from './api.js';

// events.js

document.addEventListener('DOMContentLoaded', () => {
    const feedContainer  = document.getElementById('meetupEventsFeedSection');
    const countEl        = document.getElementById('feedResultsCount');
    // searchInput lives inside the async-loaded header — use a lazy getter
    const getSearchInput = () => document.getElementById('meetupSearchInput');
    const filterCity     = document.getElementById('filterCitySelect');
    const filterCategory = document.getElementById('filterCategorySelect');
    const filterType     = document.getElementById('filterTypeSelect');
    const filterSort     = document.getElementById('filterSortSelect');

    let allEvents   = [];
    let debounceTimer = null;
    let searchListenerAttached = false;

    // Read URL params
    const urlParams    = new URLSearchParams(window.location.search);
    let initSearch     = urlParams.get('search')   || '';
    const initCity     = urlParams.get('city')      || '';
    const initCategory = urlParams.get('category')  || '';

    // Pre-fill dropdowns that exist at DOMContentLoaded
    if (filterCity  && initCity)         setSelectByValue(filterCity,     initCity);
    if (filterCategory && initCategory)  setSelectByValue(filterCategory, initCategory);

    // Watch for header injection so we can pre-fill search input and attach listener
    const headerContainer = document.getElementById('site-header') ||
                            document.getElementById('header-placeholder');
    if (headerContainer) {
        const observer = new MutationObserver(() => {
            const searchInput = getSearchInput();
            if (searchInput && !searchListenerAttached) {
                searchListenerAttached = true;
                observer.disconnect();
                if (initSearch) searchInput.value = initSearch;
                searchInput.addEventListener('input', triggerServerSearch);
            }
        });
        observer.observe(headerContainer, { childList: true, subtree: true });
    }

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

                // Only events with an uploaded banner get an image; the rest keep the plain card
                const imageBit = event.image_url
                    ? '<img class="event-feed-image" src="' + escapeHtml(event.image_url) + '" alt="" loading="lazy" onerror="this.remove()">'
                    : '';

                return '<div class="card event-feed-card' + (event.image_url ? ' has-image' : '') + '" data-event-id="' + event.id + '">' +
                    imageBit +
                    '<div class="event-feed-body">' +
                    '<div class="event-feed-top">' +
                        '<div class="flex-1">' +
                            '<div class="event-feed-category">' +
                                escapeHtml(event.category || 'General') +
                            '</div>' +
                            '<h2 class="event-feed-title">' +
                                escapeHtml(event.title) +
                            '</h2>' +
                        '</div>' +
                        '<div class="top-actions-wrap">' +
                            onlineBadge + priceBadge +
                        '</div>' +
                    '</div>' +

                    '<p class="event-feed-desc">' +
                        escapeHtml(event.description || 'No description provided.') +
                    '</p>' +

                    '<div class="event-feed-meta">' +
                        '<span class="event-feed-meta-item">' +
                            '<span class="material-symbols-outlined event-feed-meta-icon">calendar_today</span>' +
                            formatDate(event.event_date, event.start_time, event.is_date_tba) +
                        '</span>' +
                        '<span class="event-feed-meta-item">' +
                            '<span class="material-symbols-outlined event-feed-meta-icon">' + (event.is_online ? 'videocam' : 'location_on') + '</span>' +
                            (event.is_online ? 'Online Event' : escapeHtml(event.venue || event.city || 'Location TBD')) +
                        '</span>' +
                        attendeesBit + capacityBit +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }).join('') +
        '</div>';
    }

    // Client-side filter and sort
    function applyLocalFilters() {
        const category = filterCategory ? filterCategory.value : 'all';
        const type     = filterType     ? filterType.value     : 'all';
        const sort     = filterSort     ? filterSort.value     : 'date';

        let filtered = allEvents.filter(function(event) {
            if (category !== 'all' && event.category) {
                if (event.category.toLowerCase().indexOf(category.toLowerCase()) === -1) return false;
            }
            if (type === 'online'    && !event.is_online) return false;
            if (type === 'in-person' &&  event.is_online) return false;
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
        var q = (getSearchInput() ? getSearchInput().value.trim() : '') || initSearch;
        if (q) active.push({ label: '"' + q + '"', clear: function() { var si = getSearchInput(); if (si) si.value = ''; forgetUrlSearch(); triggerServerSearch(); } });

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

    // The ?search= from the URL is only a starting value; once the user clears
    // the search, stop falling back to it and drop it from the address bar
    function forgetUrlSearch() {
        initSearch = '';
        window.history.replaceState(null, '', window.location.pathname);
    }

    function clearAllFilters() {
        const searchInput = getSearchInput();
        if (searchInput)    searchInput.value = '';
        forgetUrlSearch();
        if (filterCity)     filterCity.value = 'all';
        if (filterCategory) filterCategory.value = 'all';
        if (filterType)     filterType.value = 'all';
        triggerServerSearch();
    }

    // Server-side fetch
    async function fetchAndRender() {
        const searchInput = getSearchInput();
        // On first load the header may not be injected yet — fall back to URL param
        var query = searchInput ? searchInput.value.trim() : initSearch;
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

    // Event listeners (search listener is attached via MutationObserver above once header loads)
    if (filterCity)     filterCity.addEventListener('change',  fetchAndRender);
    if (filterCategory) filterCategory.addEventListener('change', applyLocalFilters);
    if (filterType)     filterType.addEventListener('change',     applyLocalFilters);
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

    // Initial load: fill the city list first, so a ?city= from the URL can be
    // selected before the first fetch uses it
    populateCityFilter().then(fetchAndRender);
});
