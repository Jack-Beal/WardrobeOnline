// Outfits tab — display, create, worn today.

// ===== STATE =====
let outfitsData      = [];
let selectedItemIds  = new Set();
let isSavingOutfit   = false;

// ===== LOAD & RENDER =====

async function loadOutfits() {
  const container = document.getElementById('outfits-container');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div> Loading outfits…</div>';

  const { data, error } = await supabaseClient
    .from('outfits')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p class="empty-state-desc">${error.message}</p></div>`;
    return;
  }

  outfitsData = data || [];
  allOutfits  = outfitsData;
  renderOutfitsGrid();
}

function renderOutfitsGrid() {
  const container = document.getElementById('outfits-container');

  if (outfitsData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">✨</span>
        <p class="empty-state-title">No outfits yet</p>
        <p class="empty-state-desc">Tap + to build your first outfit from wardrobe items.</p>
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'outfits-grid';
  outfitsData.forEach(outfit => grid.appendChild(buildOutfitCard(outfit)));

  container.innerHTML = '';
  container.appendChild(grid);
}

function buildOutfitCard(outfit) {
  const card = document.createElement('div');
  card.className = 'outfit-card';

  // Overlapping thumbnails — resolve up to 4 item images
  const thumbsEl = document.createElement('div');
  thumbsEl.className = 'outfit-thumbnails';

  const itemIds = (outfit.item_ids || []).slice(0, 4);
  itemIds.forEach(id => {
    const item = allItems.find(i => i.id === id);
    if (item && item.image_url) {
      const img = document.createElement('img');
      img.className = 'outfit-thumb';
      img.src = item.image_url;
      img.alt = item.name;
      img.loading = 'lazy';
      thumbsEl.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'outfit-thumb-placeholder';
      ph.textContent = item ? categoryEmoji(item.category) : '👗';
      thumbsEl.appendChild(ph);
    }
  });

  // Fallback if no items resolved
  if (itemIds.length === 0) {
    const ph = document.createElement('div');
    ph.className = 'outfit-thumb-placeholder';
    ph.textContent = '✨';
    thumbsEl.appendChild(ph);
  }

  card.appendChild(thumbsEl);

  // Outfit name
  const name = document.createElement('div');
  name.className = 'outfit-name';
  name.textContent = outfit.name;
  card.appendChild(name);

  // Item count
  const count = document.createElement('div');
  count.style.cssText = 'font-size:0.72rem;color:var(--text-muted);margin-bottom:8px';
  count.textContent = `${(outfit.item_ids || []).length} item${outfit.item_ids?.length !== 1 ? 's' : ''}`;
  card.appendChild(count);

  // Worn today button
  const wornBtn = document.createElement('button');
  wornBtn.className = 'btn btn-secondary btn-sm';
  wornBtn.style.width = '100%';
  wornBtn.textContent = 'Worn today';
  wornBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    markWornToday(outfit, wornBtn);
  });
  card.appendChild(wornBtn);

  return card;
}

// ===== WORN TODAY =====

async function markWornToday(outfit, btn) {
  btn.disabled = true;
  btn.textContent = 'Logging…';

  const today = new Date().toISOString().slice(0, 10);

  // Insert outfit_log
  const { error: logErr } = await supabaseClient.from('outfit_logs').insert({
    user_id:   currentUser.id,
    outfit_id: outfit.id,
    item_ids:  outfit.item_ids,
    worn_date: today,
  });

  if (logErr) {
    btn.disabled = false;
    btn.textContent = 'Worn today';
    alert('Could not log outfit: ' + logErr.message);
    return;
  }

  // Increment wear_count and set last_worn on each item
  const itemIds = outfit.item_ids || [];
  if (itemIds.length > 0) {
    // Fetch current wear counts
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
    }

    // Update local allItems cache
    allItems = allItems.map(item => {
      if (itemIds.includes(item.id)) {
        return { ...item, wear_count: (item.wear_count || 0) + 1, last_worn: today };
      }
      return item;
    });
  }

  btn.disabled = false;
  btn.textContent = '✓ Logged!';
  setTimeout(() => { btn.textContent = 'Worn today'; }, 2000);
}

// ===== CREATE OUTFIT MODAL =====

document.getElementById('outfits-fab').addEventListener('click', openOutfitModal);
document.getElementById('outfit-modal-close').addEventListener('click', closeOutfitModal);
document.getElementById('outfit-modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('outfit-modal-overlay')) closeOutfitModal();
});

function openOutfitModal() {
  selectedItemIds = new Set();
  document.getElementById('outfit-name').value = '';
  document.getElementById('outfit-item-search').value = '';
  hideOutfitError();
  updateSelectedCount();
  populateItemPicker('');
  document.getElementById('outfit-modal-overlay').classList.add('open');
}

function closeOutfitModal() {
  document.getElementById('outfit-modal-overlay').classList.remove('open');
  selectedItemIds = new Set();
}

// Item search filter
document.getElementById('outfit-item-search').addEventListener('input', (e) => {
  populateItemPicker(e.target.value.trim().toLowerCase());
});

function populateItemPicker(query) {
  const grid = document.getElementById('outfit-item-picker');
  grid.innerHTML = '';

  // Ensure wardrobe is loaded
  if (!allItems || allItems.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;grid-column:1/-1">Add items to your wardrobe first.</p>';
    return;
  }

  const items = query
    ? allItems.filter(i =>
        i.name.toLowerCase().includes(query) ||
        i.category.toLowerCase().includes(query) ||
        i.colour.toLowerCase().includes(query)
      )
    : allItems;

  if (items.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;grid-column:1/-1">No items match.</p>';
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-picker-card' + (selectedItemIds.has(item.id) ? ' selected' : '');
    card.dataset.id = item.id;

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

    card.addEventListener('click', () => togglePickerItem(item.id, card));
    grid.appendChild(card);
  });
}

function togglePickerItem(id, cardEl) {
  if (selectedItemIds.has(id)) {
    selectedItemIds.delete(id);
    cardEl.classList.remove('selected');
  } else {
    selectedItemIds.add(id);
    cardEl.classList.add('selected');
  }
  updateSelectedCount();
}

function updateSelectedCount() {
  const el = document.getElementById('outfit-selected-count');
  const n = selectedItemIds.size;
  el.textContent = n === 0 ? 'No items selected' : `${n} item${n !== 1 ? 's' : ''} selected`;
}

function showOutfitError(msg) {
  const el = document.getElementById('outfit-form-error');
  el.textContent = msg;
  el.classList.add('visible');
}

function hideOutfitError() {
  const el = document.getElementById('outfit-form-error');
  el.textContent = '';
  el.classList.remove('visible');
}

// ===== SAVE OUTFIT =====

document.getElementById('outfit-save-btn').addEventListener('click', async () => {
  if (isSavingOutfit) return;
  hideOutfitError();

  const name = document.getElementById('outfit-name').value.trim();
  if (!name) {
    showOutfitError('Please give the outfit a name.');
    return;
  }
  if (selectedItemIds.size === 0) {
    showOutfitError('Select at least one item.');
    return;
  }

  isSavingOutfit = true;
  const btn = document.getElementById('outfit-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const { error } = await supabaseClient.from('outfits').insert({
    user_id:  currentUser.id,
    name,
    item_ids: [...selectedItemIds],
  });

  isSavingOutfit = false;
  btn.disabled = false;
  btn.textContent = 'Save outfit';

  if (error) {
    showOutfitError('Save failed: ' + error.message);
    return;
  }

  closeOutfitModal();
  loadOutfits();
});
