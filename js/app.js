// App shell — session guard, tab routing, shared state.
// Runs on app.html only.

// ===== SHARED STATE =====
// Other modules read/write these after app.js initialises them.
let currentUser = null;
let allItems    = [];   // wardrobe.js populates this
let allOutfits  = [];   // outfits.js populates this

// ===== SESSION GUARD =====

(async () => {
  const session = await requireAuth();
  if (!session) return; // requireAuth already redirects

  currentUser = session.user;

  // Wire up logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Initialise tab routing
  initTabs();

  // Load the default tab (wardrobe)
  onTabActivated('wardrobe');
})();

// ===== TAB ROUTING =====

function initTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tabName) {
  // Update nav highlight
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Show/hide panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === 'tab-' + tabName);
  });

  // Show/hide FABs per tab
  const wardrobeFab = document.getElementById('wardrobe-fab');
  const outfitsFab  = document.getElementById('outfits-fab');
  if (wardrobeFab) wardrobeFab.style.display = tabName === 'wardrobe' ? '' : 'none';
  if (outfitsFab)  outfitsFab.style.display  = tabName === 'outfits'  ? '' : 'none';

  onTabActivated(tabName);
}

// Called each time a tab becomes visible
function onTabActivated(tabName) {
  switch (tabName) {
    case 'wardrobe':
      if (typeof loadWardrobe === 'function') loadWardrobe();
      if (typeof loadWeather  === 'function') loadWeather();
      break;
    case 'outfits':
      if (typeof loadOutfits  === 'function') loadOutfits();
      break;
    case 'plan':
      if (typeof loadPlan     === 'function') loadPlan();
      break;
    case 'stats':
      if (typeof loadStats    === 'function') loadStats();
      break;
  }
}

// ===== HELPERS shared across modules =====

const CATEGORY_GROUPS = {
  'Windbreaker': 'Outerwear', 'Coat': 'Outerwear',
  'Knitwear': 'Jumpers & Hoodies', 'Jumper': 'Jumpers & Hoodies', 'Hoodie': 'Jumpers & Hoodies',
  'T-Shirt': 'Tops', 'Graphic Tee': 'Tops', 'Shirt': 'Tops',
  'Joggers': 'Bottoms', 'Jeans': 'Bottoms', 'Cargos': 'Bottoms', 'Other Bottoms': 'Bottoms',
  'Trainers': 'Shoes', 'Boots': 'Shoes', 'Formal Shoes': 'Shoes', 'Sandals': 'Shoes', 'Slippers': 'Shoes',
  'Cap': 'Accessories', 'Beanie': 'Accessories', 'Scarf': 'Accessories', 'Belt': 'Accessories',
  'Bag': 'Accessories', 'Watch': 'Accessories', 'Sunglasses': 'Accessories', 'Jewellery': 'Accessories',
};

function categoryEmoji(category) {
  const map = {
    'Windbreaker': '🧥', 'Coat': '🧥',
    'Knitwear': '🧶', 'Jumper': '🧡', 'Hoodie': '👕',
    'T-Shirt': '👕', 'Graphic Tee': '👕', 'Shirt': '👔',
    'Joggers': '👖', 'Jeans': '👖', 'Cargos': '👖', 'Other Bottoms': '👖',
    'Trainers': '👟', 'Boots': '🥾', 'Formal Shoes': '👞', 'Sandals': '🩴', 'Slippers': '🩴',
    'Cap': '🧢', 'Beanie': '🎩', 'Scarf': '🧣', 'Belt': '👔',
    'Bag': '👜', 'Watch': '⌚', 'Sunglasses': '🕶', 'Jewellery': '💍',
  };
  return map[category] || '👗';
}

function laundryLabel(status) {
  const map = { clean: 'Clean', dirty: 'Dirty', washing: 'In wash' };
  return map[status] || status;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
