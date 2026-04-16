// Weather fetch from Open-Meteo for Dundee + outfit suggestions.

const WEATHER_CODES = {
  0: ['☀️', 'Clear sky'],
  1: ['🌤', 'Mainly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫', 'Foggy'], 48: ['🌫', 'Icy fog'],
  51: ['🌦', 'Light drizzle'], 53: ['🌦', 'Drizzle'], 55: ['🌧', 'Heavy drizzle'],
  61: ['🌧', 'Light rain'], 63: ['🌧', 'Rain'], 65: ['🌧', 'Heavy rain'],
  71: ['🌨', 'Light snow'], 73: ['🌨', 'Snow'], 75: ['❄️', 'Heavy snow'],
  80: ['🌦', 'Showers'], 81: ['🌧', 'Rain showers'], 82: ['⛈', 'Violent showers'],
  95: ['⛈', 'Thunderstorm'], 96: ['⛈', 'Thunderstorm + hail'], 99: ['⛈', 'Thunderstorm + hail'],
};

let currentWeather = null; // { temp, code }

async function loadWeather() {
  const strip = document.getElementById('weather-strip');
  if (!strip) return;

  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=56.462&longitude=-2.9707&current=temperature_2m,weathercode&timezone=Europe%2FLondon'
    );
    if (!res.ok) return;
    const json = await res.json();

    const temp = Math.round(json.current.temperature_2m);
    const code = json.current.weathercode;
    const [icon, condition] = WEATHER_CODES[code] || ['🌡', 'Unknown'];

    currentWeather = { temp, code };

    document.getElementById('weather-icon').textContent = icon;
    document.getElementById('weather-temp').textContent = `${temp}°C`;
    document.getElementById('weather-condition').textContent = `${condition} · Dundee`;
    strip.style.display = 'flex';
  } catch (e) {
    // Silently fail — weather is non-critical
  }
}

// ===== SUGGEST OUTFIT =====

document.getElementById('suggest-outfit-btn').addEventListener('click', () => {
  if (!currentWeather) return;
  const { temp, code } = currentWeather;
  const isRain = code >= 51 && code <= 67;

  let categories = [];
  let note = '';

  if (temp < 8) {
    categories = ['Outerwear', 'Tops', 'Bottoms'];
    note = `${temp}°C — cold day. Prioritising warm layers.`;
  } else if (temp <= 15) {
    categories = ['Tops', 'Bottoms', 'Outerwear'];
    note = `${temp}°C — cool day. A layered look works well.`;
  } else {
    categories = ['Tops', 'Bottoms'];
    note = `${temp}°C — mild day. Light outfit suggestion.`;
  }

  // Pick one item per category from allItems
  const picked = [];
  categories.forEach(cat => {
    const match = (allItems || []).find(i => i.category === cat && !picked.includes(i));
    if (match) picked.push(match);
  });

  document.getElementById('suggest-weather-note').textContent = note;
  document.getElementById('suggest-rain-note').style.display = isRain ? '' : 'none';

  const list = document.getElementById('suggest-items-list');
  if (picked.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">Add items to your wardrobe to get suggestions.</p>';
  } else {
    list.innerHTML = picked.map(item => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--surface-alt)">
        <span style="font-size:1.8rem">${categoryEmoji(item.category)}</span>
        <div>
          <div style="font-weight:600;font-size:0.9rem">${item.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${item.colour}${item.brand ? ' · ' + item.brand : ''}</div>
        </div>
        <span class="badge badge-category" style="margin-left:auto">${item.category}</span>
      </div>
    `).join('');
  }

  document.getElementById('suggest-modal-overlay').classList.add('open');
});

document.getElementById('suggest-modal-close').addEventListener('click', () => {
  document.getElementById('suggest-modal-overlay').classList.remove('open');
});
document.getElementById('suggest-modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('suggest-modal-overlay'))
    document.getElementById('suggest-modal-overlay').classList.remove('open');
});

// ===== SHOP MY WARDROBE =====

let shopColour   = '';
let shopCategory = 'all';

document.getElementById('shop-wardrobe-btn').addEventListener('click', () => {
  shopColour   = '';
  shopCategory = 'all';
  document.getElementById('shop-colour-filter').value = '';
  document.querySelectorAll('#shop-category-chips .chip').forEach(c => {
    c.classList.toggle('active',   c.dataset.category === 'all');
    c.classList.toggle('inactive', c.dataset.category !== 'all');
  });
  renderShopList();
  document.getElementById('shop-modal-overlay').classList.add('open');
});

document.getElementById('shop-modal-close').addEventListener('click', () => {
  document.getElementById('shop-modal-overlay').classList.remove('open');
});
document.getElementById('shop-modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('shop-modal-overlay'))
    document.getElementById('shop-modal-overlay').classList.remove('open');
});

document.getElementById('shop-colour-filter').addEventListener('change', (e) => {
  shopColour = e.target.value;
  renderShopList();
});

document.getElementById('shop-category-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  shopCategory = chip.dataset.category;
  document.querySelectorAll('#shop-category-chips .chip').forEach(c => {
    c.classList.toggle('active',   c.dataset.category === shopCategory);
    c.classList.toggle('inactive', c.dataset.category !== shopCategory);
  });
  renderShopList();
});

function renderShopList() {
  const list = document.getElementById('shop-items-list');
  let items = allItems || [];

  if (shopColour)            items = items.filter(i => i.colour === shopColour);
  if (shopCategory !== 'all') items = items.filter(i => i.category === shopCategory);

  if (items.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:8px">No items match.</p>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--surface-alt)">
      <span style="font-size:1.5rem">${categoryEmoji(item.category)}</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:0.88rem">${item.name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${item.colour}${item.brand ? ' · ' + item.brand : ''}</div>
      </div>
      <span class="badge badge-category">${item.category}</span>
    </div>
  `).join('');
}
