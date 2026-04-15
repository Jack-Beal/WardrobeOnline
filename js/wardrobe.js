// Wardrobe tab — fetch, render, filter, add/edit/delete items.

// ===== STATE =====
let wardrobeItems       = [];  // full list from Supabase
let filteredItems       = [];
let activeCategory      = 'all';
let activeColour        = '';
let activeSeason        = '';
let activeBrand         = '';
let currentDetailItem   = null;
let editingItemId       = null;
let uploadedImageUrl    = null;
let isSubmittingItem    = false;

// ===== LOAD & RENDER =====

async function loadWardrobe() {
  const container = document.getElementById('wardrobe-grid-container');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div> Loading wardrobe…</div>';

  const { data, error } = await supabaseClient
    .from('items')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">⚠️</span><p class="empty-state-desc">${error.message}</p></div>`;
    return;
  }

  wardrobeItems = data || [];
  allItems = wardrobeItems; // share with app.js scope

  populateSecondaryFilterOptions();
  applyFilters();
}

function applyFilters() {
  filteredItems = wardrobeItems.filter(item => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (activeColour  && item.colour.toLowerCase()   !== activeColour.toLowerCase())  return false;
    if (activeSeason  && item.season                 !== activeSeason)                return false;
    if (activeBrand   && (item.brand || '').toLowerCase() !== activeBrand.toLowerCase()) return false;
    return true;
  });
  renderWardrobeGrid();
}

function renderWardrobeGrid() {
  const container = document.getElementById('wardrobe-grid-container');

  if (filteredItems.length === 0) {
    const isFiltered = activeCategory !== 'all' || activeColour || activeSeason || activeBrand;
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">👗</span>
        <p class="empty-state-title">${isFiltered ? 'No matches' : 'Your wardrobe is empty'}</p>
        <p class="empty-state-desc">${isFiltered ? 'Try adjusting your filters.' : 'Tap the + button to add your first item.'}</p>
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'wardrobe-grid';

  filteredItems.forEach(item => {
    grid.appendChild(buildItemCard(item));
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

function buildItemCard(item) {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.dataset.id = item.id;

  // Photo
  if (item.image_url) {
    const img = document.createElement('img');
    img.className = 'item-card-photo';
    img.src = item.image_url;
    img.alt = item.name;
    img.loading = 'lazy';
    card.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'item-card-photo-placeholder';
    ph.textContent = categoryEmoji(item.category);
    card.appendChild(ph);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'item-card-body';

  const name = document.createElement('div');
  name.className = 'item-card-name';
  name.textContent = item.name;
  body.appendChild(name);

  const badges = document.createElement('div');
  badges.className = 'item-card-badges';

  const catBadge = document.createElement('span');
  catBadge.className = 'badge badge-category';
  catBadge.textContent = item.category;
  badges.appendChild(catBadge);

  if (item.wear_count > 0) {
    const wearBadge = document.createElement('span');
    wearBadge.className = 'badge badge-wear';
    wearBadge.textContent = `×${item.wear_count}`;
    badges.appendChild(wearBadge);
  }

  // Laundry dot
  const dot = document.createElement('span');
  dot.className = `laundry-dot ${item.laundry_status || 'clean'}`;
  dot.title = laundryLabel(item.laundry_status);
  dot.addEventListener('click', (e) => {
    e.stopPropagation();
    cyclelaundry(item, dot);
  });
  badges.appendChild(dot);

  body.appendChild(badges);
  card.appendChild(body);

  // Open detail on tap
  card.addEventListener('click', () => openItemDetail(item));

  return card;
}

// ===== LAUNDRY CYCLE =====

async function cyclelaundry(item, dotEl) {
  const cycle = { clean: 'dirty', dirty: 'washing', washing: 'clean' };
  const next = cycle[item.laundry_status] || 'clean';

  // Optimistic UI
  dotEl.className = `laundry-dot ${next}`;
  dotEl.title = laundryLabel(next);
  item.laundry_status = next;

  await supabaseClient
    .from('items')
    .update({ laundry_status: next })
    .eq('id', item.id)
    .eq('user_id', currentUser.id);
}

// ===== SECONDARY FILTER OPTIONS =====

function populateSecondaryFilterOptions() {
  const colours = [...new Set(wardrobeItems.map(i => i.colour).filter(Boolean))].sort();
  const brands  = [...new Set(wardrobeItems.map(i => i.brand).filter(Boolean))].sort();

  const colourSel = document.getElementById('filter-colour');
  const brandSel  = document.getElementById('filter-brand');

  // Rebuild options (keep the first "All" option)
  colourSel.innerHTML = '<option value="">All colours</option>';
  colours.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    if (c.toLowerCase() === activeColour.toLowerCase()) opt.selected = true;
    colourSel.appendChild(opt);
  });

  brandSel.innerHTML = '<option value="">All brands</option>';
  brands.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    if (b.toLowerCase() === activeBrand.toLowerCase()) opt.selected = true;
    brandSel.appendChild(opt);
  });
}

// ===== FILTER WIRING =====

document.getElementById('category-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  activeCategory = chip.dataset.category;
  document.querySelectorAll('#category-chips .chip').forEach(c => {
    c.classList.toggle('active',   c.dataset.category === activeCategory);
    c.classList.toggle('inactive', c.dataset.category !== activeCategory);
  });
  applyFilters();
});

document.getElementById('filter-colour').addEventListener('change', (e) => {
  activeColour = e.target.value;
  applyFilters();
});

document.getElementById('filter-season').addEventListener('change', (e) => {
  activeSeason = e.target.value;
  applyFilters();
});

document.getElementById('filter-brand').addEventListener('change', (e) => {
  activeBrand = e.target.value;
  applyFilters();
});

// Secondary filters toggle
document.getElementById('secondary-filters-toggle').addEventListener('click', () => {
  const toggle = document.getElementById('secondary-filters-toggle');
  const body   = document.getElementById('secondary-filters-body');
  toggle.classList.toggle('open');
  body.classList.toggle('open');
});

// ===== ITEM DETAIL VIEW =====

function openItemDetail(item) {
  currentDetailItem = item;

  const overlay = document.getElementById('item-detail-overlay');

  // Photo
  const photo = document.getElementById('detail-photo');
  const ph    = document.getElementById('detail-photo-placeholder');
  if (item.image_url) {
    photo.src = item.image_url;
    photo.style.display = 'block';
    ph.style.display = 'none';
  } else {
    photo.style.display = 'none';
    ph.style.display = 'flex';
    ph.textContent = categoryEmoji(item.category);
  }

  document.getElementById('detail-name').textContent = item.name;

  // Meta badges
  const meta = document.getElementById('detail-meta');
  meta.innerHTML = `
    <span class="badge badge-category">${item.category}</span>
    <span class="laundry-dot ${item.laundry_status || 'clean'}" title="${laundryLabel(item.laundry_status)}"></span>
  `;

  document.getElementById('detail-colour').textContent     = item.colour;
  document.getElementById('detail-season').textContent     = item.season;
  document.getElementById('detail-brand').textContent      = item.brand || '—';
  document.getElementById('detail-wear-count').textContent = item.wear_count || 0;
  document.getElementById('detail-last-worn').textContent  = formatDate(item.last_worn);
  document.getElementById('detail-laundry').textContent    = laundryLabel(item.laundry_status);
  document.getElementById('detail-care').textContent       = item.care_notes || '—';

  overlay.classList.add('open');
}

document.getElementById('detail-back-btn').addEventListener('click', () => {
  document.getElementById('item-detail-overlay').classList.remove('open');
  currentDetailItem = null;
});

document.getElementById('detail-edit-btn').addEventListener('click', () => {
  document.getElementById('item-detail-overlay').classList.remove('open');
  openItemModal(currentDetailItem);
});

document.getElementById('detail-delete-btn').addEventListener('click', async () => {
  if (!currentDetailItem) return;
  if (!confirm(`Delete "${currentDetailItem.name}"? This cannot be undone.`)) return;

  const item = currentDetailItem;

  // Delete image from storage if present
  if (item.image_url) {
    const path = item.image_url.split('/wardrobe-images/')[1];
    if (path) {
      await supabaseClient.storage.from('wardrobe-images').remove([path]);
    }
  }

  await supabaseClient.from('items').delete().eq('id', item.id).eq('user_id', currentUser.id);

  document.getElementById('item-detail-overlay').classList.remove('open');
  currentDetailItem = null;
  loadWardrobe();
});

// ===== ADD / EDIT MODAL =====

document.getElementById('wardrobe-fab').addEventListener('click', () => openItemModal(null));

document.getElementById('item-modal-close').addEventListener('click', closeItemModal);
document.getElementById('item-modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('item-modal-overlay')) closeItemModal();
});

function openItemModal(item) {
  editingItemId    = item ? item.id : null;
  uploadedImageUrl = item ? item.image_url : null;

  document.getElementById('item-modal-title').textContent = item ? 'Edit item' : 'Add item';
  document.getElementById('item-id').value          = item ? item.id       : '';
  document.getElementById('item-name').value         = item ? item.name     : '';
  document.getElementById('item-category').value     = item ? item.category : '';
  document.getElementById('item-colour').value       = item ? item.colour   : '';
  document.getElementById('item-season').value       = item ? item.season   : '';
  document.getElementById('item-brand').value        = item ? (item.brand || '') : '';
  document.getElementById('item-care').value         = item ? (item.care_notes || '') : '';
  document.getElementById('item-laundry').value      = item ? (item.laundry_status || 'clean') : 'clean';

  // Photo preview
  const preview  = document.getElementById('photo-preview');
  const label    = document.getElementById('file-input-label');
  if (item && item.image_url) {
    preview.src = item.image_url;
    preview.classList.add('visible');
    label.textContent = '📷 Change photo';
    label.classList.add('has-file');
  } else {
    preview.src = '';
    preview.classList.remove('visible');
    label.textContent = '📷 Tap to add photo';
    label.classList.remove('has-file');
  }

  // Reset file input
  document.getElementById('item-photo').value = '';

  hideFormError();
  document.getElementById('item-modal-overlay').classList.add('open');
}

function closeItemModal() {
  document.getElementById('item-modal-overlay').classList.remove('open');
  editingItemId    = null;
  uploadedImageUrl = null;
}

// Photo preview on file select
document.getElementById('item-photo').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const label = document.getElementById('file-input-label');
  label.textContent = `📷 ${file.name}`;
  label.classList.add('has-file');

  const preview = document.getElementById('photo-preview');
  preview.src = URL.createObjectURL(file);
  preview.classList.add('visible');
});

function showFormError(msg) {
  const el = document.getElementById('item-form-error');
  el.textContent = msg;
  el.classList.add('visible');
}

function hideFormError() {
  const el = document.getElementById('item-form-error');
  el.textContent = '';
  el.classList.remove('visible');
}

// ===== IMAGE COMPRESSION =====

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_WIDTH = 800;
      let width  = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.round(height * MAX_WIDTH / width);
        width  = MAX_WIDTH;
      }

      const canvas  = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas compression failed'));
        },
        'image/jpeg',
        0.7
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image'));
    };

    img.src = objectUrl;
  });
}

// ===== FORM SUBMIT =====

document.getElementById('item-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSubmittingItem) return;

  hideFormError();

  const name     = document.getElementById('item-name').value.trim();
  const category = document.getElementById('item-category').value;
  const colour   = document.getElementById('item-colour').value.trim();
  const season   = document.getElementById('item-season').value;

  if (!name || !category || !colour || !season) {
    showFormError('Please fill in all required fields.');
    return;
  }

  isSubmittingItem = true;
  const btn = document.getElementById('item-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  // Compress and upload photo if a new file was selected
  const fileInput = document.getElementById('item-photo');
  const file = fileInput.files[0];

  if (file) {
    let blob;
    try {
      blob = await compressImage(file);
    } catch (err) {
      showFormError('Image processing failed: ' + err.message);
      isSubmittingItem = false;
      btn.disabled = false;
      btn.textContent = 'Save item';
      return;
    }

    const path = `${currentUser.id}/${Date.now()}.jpg`;
    const { error: uploadErr } = await supabaseClient.storage
      .from('wardrobe-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (uploadErr) {
      showFormError('Photo upload failed: ' + uploadErr.message);
      isSubmittingItem = false;
      btn.disabled = false;
      btn.textContent = 'Save item';
      return;
    }

    const { data: urlData } = supabaseClient.storage
      .from('wardrobe-images')
      .getPublicUrl(path);
    uploadedImageUrl = urlData.publicUrl;
  }

  const payload = {
    name,
    category,
    colour,
    season,
    brand:          document.getElementById('item-brand').value.trim() || null,
    care_notes:     document.getElementById('item-care').value.trim()  || null,
    laundry_status: document.getElementById('item-laundry').value,
    image_url:      uploadedImageUrl || null,
    user_id:        currentUser.id,
  };

  let dbError;

  if (editingItemId) {
    const { error } = await supabaseClient
      .from('items')
      .update(payload)
      .eq('id', editingItemId)
      .eq('user_id', currentUser.id);
    dbError = error;
  } else {
    const { error } = await supabaseClient.from('items').insert(payload);
    dbError = error;
  }

  isSubmittingItem = false;
  btn.disabled = false;
  btn.textContent = 'Save item';

  if (dbError) {
    showFormError('Save failed: ' + dbError.message);
    return;
  }

  closeItemModal();
  loadWardrobe();
});
