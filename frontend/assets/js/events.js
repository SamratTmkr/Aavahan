// ============================================================
// Events Explorer Logic â€” explore.html
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const feedContainer  = document.getElementById('meetupEventsFeedSection');
    const countEl        = document.getElementById('feedResultsCount');
    const searchInput    = document.getElementById('meetupSearchInput');
    const filterCity     = document.getElementById('filterCitySelect');
    const filterCategory = document.getElementById('filterCategorySelect');
    const filterType     = document.getElementById('filterTypeSelect');
    const filterDay      = document.getElementById('filterDaySelect');
    const filterSort     = document.getElementById('filterSortSelect');

    let allEvents   = [];   // raw events from server (already filtered by search + city)
    let debounceTimer = null;

    // ----------------------------------------------------------
    // 1. Read URL params and pre-fill controls
    // ----------------------------------------------------------
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

    // ----------------------------------------------------------
    // 2. Date helpers
    // ----------------------------------------------------------
    function formatDate(dateStr, timeStr) {
        if (!dateStr) return 'Date TBD';
        const d = new Date(dateStr);
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        let formatted = d.toLocaleDateString('en-US', options);
        if (timeStr) formatted += ' \u00b7 ' + timeStr.slice(0, 5);
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

    // ----------------------------------------------------------
    // 3. Render events
    // ----------------------------------------------------------
    function renderEvents(events) {
        if (!feedContainer) return;

        if (events.length === 0) {
            feedContainer.innerHTML =
                '<div style="text-align:center;padding:5rem 1rem;color:var(--text-muted);">' +
                '<span class="material-symbols-outlined" style="font-size:52px;color:var(--border-color);margin-bottom:1rem;display:block;">search_off</span>' +
                '<h3 style="font-size:1.3rem;font-weight:800;color:var(--text-primary);margin-bottom:0.5rem;">No events found</h3>' +
                '<p style="margin-bottom:1.75rem;max-width:380px;margin-left:auto;margin-right:auto;">Try adjusting your search terms or filters â€” or be the first to host an event!</p>' +
                '<a href="create-event.html" class="btn btn-primary btn-pill">Start an Event</a>' +
                '</div>';
            if (countEl) countEl.textContent = '0 events found';
            return;
        }

        if (countEl) {
            countEl.textContent = 'Showing ' + events.length + ' event' + (events.length === 1 ? '' : 's');
        }

        feedContainer.innerHTML = '<div style="display:flex;flex-direction:column;gap:1.25rem;">' +
            events.map(function(event) {
                const priceBadge = (event.is_free || !event.min_price || event.min_price == 0)
                    ? '<span class="badge" style="background-color:#e6f7f7;color:#00828a;font-weight:700;">FREE</span>'
                    : '<span class="badge" style="background-color:#f1f5f9;color:var(--text-primary);font-weight:700;">NPR ' + Number(event.min_price).toLocaleString() + '</span>';

                const onlineBadge = event.is_online
                    ? '<span class="badge" style="background-color:#e0f2fe;color:#0284c7;font-weight:600;">Online</span>'
                    : '';

                const attendeesBit = event.attendee_count
                    ? '<span style="display:inline-flex;align-items:center;gap:0.35rem;"><span class="material-symbols-outlined" style="font-size:15px;color:var(--teal);">group</span>' + event.attendee_count + ' going</span>'
                    : '';

                const capacityBit = event.capacity
                    ? '<span style="display:inline-flex;align-items:center;gap:0.35rem;margin-left:auto;"><span class="material-symbols-outlined" style="font-size:15px;">chair</span>Limit: ' + event.capacity + '</span>'
                    : '';

                return '<div class="card event-list-card"' +
                    ' style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem;border-radius:var(--radius-md);border:1px solid var(--border-color);background:#ffffff;transition:box-shadow 0.2s ease,transform 0.2s ease;cursor:pointer;"' +
                    ' onclick="window.location.href=\'event-details.html?id=' + event.id + '\'"' +
                    ' onmouseenter="this.style.boxShadow=\'0 6px 24px rgba(0,0,0,0.10)\';this.style.transform=\'translateY(-2px)\'"' +
                    ' onmouseleave="this.style.boxShadow=\'\';this.style.transform=\'\'">' +

                    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">' +
                        '<div style="flex:1;min-width:0;">' +
                            '<div style="font-size:0.75rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.3rem;">' +
                                (event.category || 'General') +
                            '</div>' +
                            '<h2 style="font-size:1.2rem;font-weight:800;color:var(--text-primary);margin-bottom:0.35rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                                event.title +
                            '</h2>' +
                        '</div>' +
                        '<div style="display:flex;gap:0.5rem;align-items:center;flex-shrink:0;">' +
                            onlineBadge + priceBadge +
                        '</div>' +
                    '</div>' +

                    '<p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.55;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' +
                        (event.description || 'No description provided.') +
                    '</p>' +

                    '<div style="display:flex;flex-wrap:wrap;gap:1.5rem;font-size:0.82rem;color:var(--text-muted);margin-top:0.25rem;padding-top:0.75rem;border-top:1px solid var(--border-color);">' +
                        '<span style="display:inline-flex;align-items:center;gap:0.35rem;">' +
                            '<span class="material-symbols-outlined" style="font-size:15px;color:var(--teal);">calendar_today</span>' +
                            formatDate(event.event_date, event.start_time) +
                        '</span>' +
                        '<span style="display:inline-flex;align-items:center;gap:0.35rem;">' +
                            '<span class="material-symbols-outlined" style="font-size:15px;color:var(--teal);">' + (event.is_online ? 'videocam' : 'location_on') + '</span>' +
                            (event.is_online ? 'Online Event' : (event.venue || event.city || 'Kathmandu, Nepal')) +
                        '</span>' +
                        attendeesBit + capacityBit +
                    '</div>' +
                    '</div>';
            }).join('') +
        '</div>';
    }

    // ----------------------------------------------------------
    // 4. Client-side filter + sort (applied on top of server results)
    // ----------------------------------------------------------
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
            filtered.sort(function(a, b) { return new Date(a.event_date) - new Date(b.event_date); });
        }

        renderEvents(filtered);
        updateActiveFiltersBar();
    }

    // ----------------------------------------------------------
    // 5. Active Filters indicator bar
    // ----------------------------------------------------------
    function updateActiveFiltersBar() {
        var bar = document.getElementById('activeFiltersBar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'activeFiltersBar';
            bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;margin-bottom:1rem;min-height:1px;';
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
            return '<button data-filter-idx="' + i + '" class="active-filter-chip"' +
                ' style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.2rem 0.65rem;border-radius:var(--radius-full);background:var(--primary-light);color:var(--primary);border:1px solid var(--primary);font-size:0.78rem;font-weight:600;cursor:pointer;">' +
                f.label +
                '<span class="material-symbols-outlined" style="font-size:13px;">close</span>' +
                '</button>';
        }).join('');

        bar.innerHTML =
            '<span style="font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-right:0.25rem;">Active filters:</span>' +
            chipsHTML +
            '<button id="clearAllFiltersBtn" style="font-size:0.78rem;font-weight:600;color:var(--text-muted);background:none;border:none;cursor:pointer;margin-left:0.25rem;text-decoration:underline;">Clear all</button>';

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

    // ----------------------------------------------------------
    // 6. Server-side fetch (search + city)
    // ----------------------------------------------------------
    async function fetchAndRender() {
        var query = searchInput ? searchInput.value.trim() : '';
        var city  = (filterCity && filterCity.value !== 'all') ? filterCity.value : null;

        if (countEl) countEl.textContent = 'Searching\u2026';
        if (feedContainer) {
            feedContainer.innerHTML =
                '<div style="display:flex;justify-content:center;padding:4rem 1rem;">' +
                '<div style="text-align:center;color:var(--text-muted);">' +
                '<span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:0.75rem;animation:aav-spin 1s linear infinite;">sync</span>' +
                '<p>Loading events\u2026</p>' +
                '</div></div>';
        }

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
                    '<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">' +
                    '<span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:0.75rem;color:var(--border-color);">cloud_off</span>' +
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

    // ----------------------------------------------------------
    // 7. Attach listeners
    // ----------------------------------------------------------
    if (searchInput)    searchInput.addEventListener('input',  triggerServerSearch);
    if (filterCity)     filterCity.addEventListener('change',  fetchAndRender);
    if (filterCategory) filterCategory.addEventListener('change', applyLocalFilters);
    if (filterType)     filterType.addEventListener('change',     applyLocalFilters);
    if (filterDay)      filterDay.addEventListener('change',      applyLocalFilters);
    if (filterSort)     filterSort.addEventListener('change',     applyLocalFilters);

    // ----------------------------------------------------------
    // 8. Spin animation for loading indicator
    // ----------------------------------------------------------
    if (!document.getElementById('aavSpinStyle')) {
        var style = document.createElement('style');
        style.id = 'aavSpinStyle';
        style.textContent = '@keyframes aav-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    // ----------------------------------------------------------
    // 9. Initial load
    // ----------------------------------------------------------
    fetchAndRender();
});

