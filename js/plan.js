// Plan tab — monthly calendar, planned outfits, mark as worn.

// ===== STATE =====
let calYear         = new Date().getFullYear();
let calMonth        = new Date().getMonth(); // 0-based
let plannedByDate   = {};  // { 'YYYY-MM-DD': plannedOutfit row }
let logDates        = new Set(); // dates that have outfit_log entries
let activeDayDate   = null; // 'YYYY-MM-DD' currently open in day detail
let planMode        = 'saved'; // 'saved' | 'items'
let planSelectedIds = new Set();
let isSavingPlan    = false;
let planTargetDate  = null; // date being planned

// ===== ENTRY POINT =====

async function loadPlan() {
  const container = document.getElementById('plan-container');
  container.innerHTML = `
    <div class="plan-section">
      <div class="calendar-header">
        <button class="calendar-nav-btn" id="cal-prev">‹</button>
        <span class="calendar-month-label" id="cal-month-label"></span>
        <button class="calendar-nav-btn" id="cal-next">›</button>
      </div>
      <div id="cal-grid"></div>
    </div>`;

  document.getElementById('cal-prev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    fetchAndRenderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    fetchAndRenderCalendar();
  });

  await fetchAndRenderCalendar();
}

async function fetchAndRenderCalendar() {
  // Date range for the visible month
  const firstDay = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
  const lastDate  = new Date(calYear, calMonth + 1, 0).getDate();
  const lastDay   = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;

  // Fetch planned outfits for this month
  const { data: planned } = await supabaseClient
    .from('planned_outfits')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('planned_date', firstDay)
    .lte('planned_date', lastDay);

  plannedByDate = {};
  (planned || []).forEach(p => { plannedByDate[p.planned_date] = p; });

  // Fetch outfit logs for this month (to mark worn days)
  const { data: logs } = await supabaseClient
    .from('outfit_logs')
    .select('worn_date')
    .eq('user_id', currentUser.id)
    .gte('worn_date', firstDay)
    .lte('worn_date', lastDay);

  logDates = new Set((logs || []).map(l => l.worn_date));

  renderCalendar();
}

function renderCalendar() {
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent = `${monthNames[calMonth]} ${calYear}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const calGrid = document.createElement('div');
  calGrid.className = 'calendar-grid';

  // Day headers — Monday first (UK)
  ['Mo','Tu','We','Th','Fr','Sa','Su'].forEach(d => {
    const h = document.createElement('div');
    h.className = 'calendar-day-header';
    h.textContent = d;
    calGrid.appendChild(h);
  });

  // First day of month (0=Sun … 6=Sat) → shift to Monday-first
  const firstWeekday = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const offset = (firstWeekday + 6) % 7; // Mon=0 … Sun=6

  const daysInMonth    = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();
  const todayStr       = new Date().toISOString().slice(0, 10);

  // Leading blank cells (prev month days, greyed)
  for (let i = 0; i < offset; i++) {
    const day = document.createElement('div');
    day.className = 'calendar-day other-month';
    day.textContent = daysInPrevMonth - offset + 1 + i;
    calGrid.appendChild(day);
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const day = document.createElement('div');
    day.className = 'calendar-day';
    if (dateStr === todayStr) day.classList.add('today');

    const isPlanned = !!plannedByDate[dateStr];
    const isWorn    = logDates.has(dateStr);
    if (isWorn)    day.classList.add('worn');
    else if (isPlanned) day.classList.add('has-outfit');

    day.textContent = d;
    day.addEventListener('click', () => openDayDetail(dateStr));
    calGrid.appendChild(day);
  }

  // Trailing cells
  const totalCells = offset + daysInMonth;
  const trailing   = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= trailing; i++) {
    const day = document.createElement('div');
    day.className = 'calendar-day other-month';
    day.textContent = i;
    calGrid.appendChild(day);
  }

  grid.appendChild(calGrid);
}

// ===== DAY DETAIL PANEL =====

function openDayDetail(dateStr) {
  activeDayDate = dateStr;
  const planned = plannedByDate[dateStr];
  const isWorn  = logDates.has(dateStr);

  // Format date label
  const d = new Date(dateStr + 'T00:00:00');
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('day-detail-title').textContent = label;

  const hasOutfitEl  = document.getElementById('day-has-outfit');
  const noOutfitEl   = document.getElementById('day-no-outfit');
  const wornIndicator = document.getElementById('day-worn-indicator');

  if (planned) {
    hasOutfitEl.style.display = '';
    noOutfitEl.style.display  = 'none';

    // Populate thumbnails
    const thumbsEl = document.getElementById('day-outfit-thumbs');
    thumbsEl.innerHTML = '';
    const itemIds = planned.item_ids || [];

    // Try to get outfit name
    let outfitName = '';
    if (planned.outfit_id) {
      const outfit = allOutfits.find(o => o.id === planned.outfit_id);
      if (outfit) outfitName = outfit.name;
    }
    document.getElementById('day-outfit-name').textContent = outfitName || 'Custom outfit';
    document.getElementById('day-outfit-items-count').textContent =
      `${itemIds.length} item${itemIds.length !== 1 ? 's' : ''}`;

    itemIds.slice(0, 4).forEach(id => {
      const item = allItems.find(i => i.id === id);
      if (item && item.image_url) {
        const img = document.createElement('img');
        img.className = 'outfit-thumb';
        img.src = item.image_url;
        img.alt = item.name;
        thumbsEl.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'outfit-thumb-placeholder';
        ph.textContent = item ? categoryEmoji(item.category) : '👗';
        thumbsEl.appendChild(ph);
      }
    });

    // Worn indicator
    if (isWorn) {
      wornIndicator.style.display = '';
      document.getElementById('day-mark-worn-btn').style.display = 'none';
    } else {
      wornIndicator.style.display = 'none';
      document.getElementById('day-mark-worn-btn').style.display = '';
    }

  } else {
    hasOutfitEl.style.display = 'none';
    noOutfitEl.style.display  = '';
  }

  document.getElementById('day-detail-overlay').classList.add('open');
}

document.getElementById('day-detail-close').addEventListener('click', () => {
  document.getElementById('day-detail-overlay').classList.remove('open');
  activeDayDate = null;
});

document.getElementById('day-detail-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('day-detail-overlay')) {
    document.getElementById('day-detail-overlay').classList.remove('open');
    activeDayDate = null;
  }
});

// Plan outfit from empty day
document.getElementById('day-plan-outfit-btn').addEventListener('click', () => {
  document.getElementById('day-detail-overlay').classList.remove('open');
  openPlanOutfitModal(activeDayDate);
});

// Change outfit from planned day
document.getElementById('day-change-outfit-btn').addEventListener('click', () => {
  document.getElementById('day-detail-overlay').classList.remove('open');
  openPlanOutfitModal(activeDayDate);
});

// Mark as worn
document.getElementById('day-mark-worn-btn').addEventListener('click', async () => {
  const planned = plannedByDate[activeDayDate];
  if (!planned) return;

  const btn = document.getElementById('day-mark-worn-btn');
  btn.disabled = true;
  btn.textContent = 'Logging…';

  const today = activeDayDate;
  const itemIds = planned.item_ids || [];

  // Create outfit_log
  await supabaseClient.from('outfit_logs').insert({
    user_id:   currentUser.id,
    outfit_id: planned.outfit_id || null,
    item_ids:  itemIds,
    worn_date: today,
  });

  // Update wear counts
  if (itemIds.length > 0) {
    const { data: items } = await supabaseClient
      .from('items')
      .select('id, wear_count')
      .in('id', itemIds)
      .eq('user_id', currentUser.id);

    if (items) {
      await Promise.all(items.map(item =>
        supabaseClient
          .from('items')
          .update({ wear_count: (item.wear_count || 0) + 1, last_worn: today })
          .eq('id', item.id)
          .eq('user_id', currentUser.id)
      ));
      // Update local cache
      allItems = allItems.map(i =>
        itemIds.includes(i.id)
          ? { ...i, wear_count: (i.wear_count || 0) + 1, last_worn: today }
          : i
      );
    }
  }

  logDates.add(today);
  btn.disabled = false;
  btn.textContent = 'Mark as worn';
  document.getElementById('day-worn-indicator').style.display = '';
  btn.style.display = 'none';

  // Re-render calendar dot
  renderCalendar();
});

// ===== PLAN OUTFIT MODAL =====

function openPlanOutfitModal(dateStr) {
  planTargetDate  = dateStr;
  planSelectedIds = new Set();
  planMode        = 'saved';

  const d = new Date(dateStr + 'T00:00:00');
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('plan-outfit-title').textContent = `Plan — ${label}`;

  hidePlanError();
  setPlanMode('saved');
  document.getElementById('plan-outfit-overlay').classList.add('open');
}

document.getElementById('plan-outfit-close').addEventListener('click', () => {
  document.getElementById('plan-outfit-overlay').classList.remove('open');
});

document.getElementById('plan-outfit-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('plan-outfit-overlay')) {
    document.getElementById('plan-outfit-overlay').classList.remove('open');
  }
});

// Mode toggle chips
document.getElementById('plan-mode-saved').addEventListener('click', () => setPlanMode('saved'));
document.getElementById('plan-mode-items').addEventListener('click', () => setPlanMode('items'));

function setPlanMode(mode) {
  planMode = mode;
  document.getElementById('plan-mode-saved').className = 'chip ' + (mode === 'saved' ? 'active' : 'inactive');
  document.getElementById('plan-mode-items').className = 'chip ' + (mode === 'items' ? 'active' : 'inactive');
  document.getElementById('plan-saved-outfits-view').style.display = mode === 'saved' ? '' : 'none';
  document.getElementById('plan-items-view').style.display          = mode === 'items' ? '' : 'none';

  if (mode === 'saved') populateSavedOutfitsList();
  if (mode === 'items') populatePlanItemPicker('');
}

// ===== SAVED OUTFITS LIST =====

function populateSavedOutfitsList() {
  const list = document.getElementById('plan-outfit-list');
  list.innerHTML = '';

  if (!allOutfits || allOutfits.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No saved outfits yet. Switch to "Pick items" to build one.</p>';
    return;
  }

  allOutfits.forEach(outfit => {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px;background:var(--surface);border-radius:12px;cursor:pointer';

    const radio = document.createElement('input');
    radio.type  = 'radio';
    radio.name  = 'plan-outfit-radio';
    radio.value = outfit.id;
    radio.style.accentColor = 'var(--primary)';

    // Thumbnail
    const firstItemId = outfit.item_ids?.[0];
    const firstItem   = firstItemId ? allItems.find(i => i.id === firstItemId) : null;
    const thumb       = document.createElement('div');
    thumb.style.cssText = 'width:40px;height:52px;border-radius:8px;overflow:hidden;flex-shrink:0';
    if (firstItem && firstItem.image_url) {
      const img = document.createElement('img');
      img.src = firstItem.image_url;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover';
      thumb.appendChild(img);
    } else {
      thumb.style.background = 'var(--surface-alt)';
      thumb.style.display    = 'flex';
      thumb.style.alignItems = 'center';
      thumb.style.justifyContent = 'center';
      thumb.textContent = '✨';
    }

    const info = document.createElement('div');
    info.style.flex = '1';

    const name = document.createElement('div');
    name.style.cssText = 'font-weight:600;font-size:0.88rem';
    name.textContent = outfit.name;

    const count = document.createElement('div');
    count.style.cssText = 'font-size:0.75rem;color:var(--text-muted)';
    count.textContent = `${(outfit.item_ids || []).length} items`;

    info.appendChild(name);
    info.appendChild(count);
    row.appendChild(radio);
    row.appendChild(thumb);
    row.appendChild(info);
    list.appendChild(row);
  });
}

// ===== PLAN ITEM PICKER =====

function populatePlanItemPicker(query) {
  const grid = document.getElementById('plan-item-picker');
  grid.innerHTML = '';

  if (!allItems || allItems.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;grid-column:1/-1">Add items to your wardrobe first.</p>';
    return;
  }

  const items = query
    ? allItems.filter(i =>
        i.name.toLowerCase().includes(query) ||
        i.category.toLowerCase().includes(query) ||
        i.colour.toLowerCase().includes(query))
    : allItems;

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-picker-card' + (planSelectedIds.has(item.id) ? ' selected' : '');

    if (item.image_url) {
      const img = document.createElement('img');
      img.src = item.image_url;
      img.alt = item.name;
      img.loading = 'lazy';
      card.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'item-picker-placeholder';
      ph.textContent = categoryEmoji(item.category);
      card.appendChild(ph);
    }

    const check = document.createElement('div');
    check.className = 'check-overlay';
    check.textContent = '✓';
    card.appendChild(check);

    const label = document.createElement('div');
    label.className = 'item-picker-name';
    label.textContent = item.name;
    card.appendChild(label);

    card.addEventListener('click', () => {
      if (planSelectedIds.has(item.id)) {
        planSelectedIds.delete(item.id);
        card.classList.remove('selected');
      } else {
        planSelectedIds.add(item.id);
        card.classList.add('selected');
      }
      const n = planSelectedIds.size;
      document.getElementById('plan-items-selected-count').textContent =
        n === 0 ? 'No items selected' : `${n} item${n !== 1 ? 's' : ''} selected`;
    });

    grid.appendChild(card);
  });

  document.getElementById('plan-items-selected-count').textContent = 'No items selected';
}

document.getElementById('plan-item-search').addEventListener('input', (e) => {
  populatePlanItemPicker(e.target.value.trim().toLowerCase());
});

// ===== SAVE PLAN =====

document.getElementById('plan-outfit-save-btn').addEventListener('click', async () => {
  if (isSavingPlan) return;
  hidePlanError();

  let outfitId = null;
  let itemIds  = [];

  if (planMode === 'saved') {
    const selected = document.querySelector('input[name="plan-outfit-radio"]:checked');
    if (!selected) { showPlanError('Select a saved outfit.'); return; }
    outfitId = selected.value;
    const outfit = allOutfits.find(o => o.id === outfitId);
    itemIds = outfit ? (outfit.item_ids || []) : [];
  } else {
    if (planSelectedIds.size === 0) { showPlanError('Select at least one item.'); return; }
    itemIds = [...planSelectedIds];
  }

  isSavingPlan = true;
  const btn = document.getElementById('plan-outfit-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  // Remove any existing plan for this date first
  await supabaseClient
    .from('planned_outfits')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('planned_date', planTargetDate);

  const { error } = await supabaseClient.from('planned_outfits').insert({
    user_id:      currentUser.id,
    outfit_id:    outfitId,
    item_ids:     itemIds,
    planned_date: planTargetDate,
  });

  isSavingPlan = false;
  btn.disabled = false;
  btn.textContent = 'Save plan';

  if (error) { showPlanError('Save failed: ' + error.message); return; }

  document.getElementById('plan-outfit-overlay').classList.remove('open');
  await fetchAndRenderCalendar();
});

function showPlanError(msg) {
  const el = document.getElementById('plan-outfit-error');
  el.textContent = msg;
  el.classList.add('visible');
}

function hidePlanError() {
  const el = document.getElementById('plan-outfit-error');
  el.textContent = '';
  el.classList.remove('visible');
}
