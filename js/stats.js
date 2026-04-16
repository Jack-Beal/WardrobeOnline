// Stats tab — summary cards, wear rankings, forgotten items, style charts, outfit history.

async function loadStats() {
  const container = document.getElementById('stats-container');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div> Loading stats…</div>';

  const userId = currentUser.id;
  const today  = new Date();
  const todayStr   = today.toISOString().slice(0, 10);
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay    = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthEnd   = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const [
    { data: items },
    { data: outfits },
    { data: monthLogs },
  ] = await Promise.all([
    supabaseClient.from('items').select('*').eq('user_id', userId),
    supabaseClient.from('outfits').select('id').eq('user_id', userId),
    supabaseClient.from('outfit_logs').select('worn_date').eq('user_id', userId)
      .gte('worn_date', monthStart).lte('worn_date', monthEnd),
  ]);

  const allItemsData   = items || [];
  const totalItems     = allItemsData.length;
  const totalOutfits   = (outfits || []).length;
  const logsThisMonth  = (monthLogs || []).length;
  const logDateSet     = new Set((monthLogs || []).map(l => l.worn_date));

  // Top 5 most worn
  const topWorn = [...allItemsData]
    .filter(i => i.wear_count > 0)
    .sort((a, b) => b.wear_count - a.wear_count)
    .slice(0, 5);

  // Forgotten: never worn OR last worn > 60 days ago
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyStr = sixtyDaysAgo.toISOString().slice(0, 10);
  const forgotten = allItemsData.filter(i =>
    i.wear_count === 0 || !i.last_worn || i.last_worn < sixtyStr
  );

  // Not worn in 30 days (but worn at least once)
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyStr = thirtyDaysAgo.toISOString().slice(0, 10);
  const notIn30 = allItemsData.filter(i =>
    i.wear_count > 0 && i.last_worn && i.last_worn < thirtyStr
  );

  // Style stats: count wear_count per colour / subcategory / brand
  const colourCounts = {}, catCounts = {}, brandCounts = {};
  allItemsData.forEach(i => {
    const w = i.wear_count || 0;
    if (i.colour)   colourCounts[i.colour]   = (colourCounts[i.colour]   || 0) + w;
    if (i.category) catCounts[i.category]    = (catCounts[i.category]    || 0) + w;
    if (i.brand)    brandCounts[i.brand]     = (brandCounts[i.brand]     || 0) + w;
  });
  const topColours = Object.entries(colourCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topCats    = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topBrands  = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const monthName = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div style="padding:16px 16px 32px">

      <!-- Summary cards -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-number">${totalItems}</div>
          <div class="stat-label">Items</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${totalOutfits}</div>
          <div class="stat-label">Outfits</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${logsThisMonth}</div>
          <div class="stat-label">Worn this month</div>
        </div>
      </div>

      <!-- Most worn -->
      <h3 class="section-title">Most worn</h3>
      <div id="stats-most-worn" style="margin-bottom:20px"></div>

      <!-- Forgotten -->
      <h3 class="section-title">Forgotten (60+ days)</h3>
      <div id="stats-forgotten" style="margin-bottom:20px"></div>

      <!-- Not worn in 30 days -->
      <h3 class="section-title">Not worn in 30 days</h3>
      <div id="stats-not30" style="margin-bottom:20px"></div>

      <!-- Style stats -->
      <h3 class="section-title">By colour</h3>
      <div class="bar-chart" id="stats-colour-chart" style="margin-bottom:20px"></div>

      <h3 class="section-title">By category</h3>
      <div class="bar-chart" id="stats-cat-chart" style="margin-bottom:20px"></div>

      <h3 class="section-title">By brand</h3>
      <div class="bar-chart" id="stats-brand-chart" style="margin-bottom:20px"></div>

      <!-- Outfit history calendar -->
      <h3 class="section-title">Outfit history — ${monthName}</h3>
      <div id="stats-cal" style="margin-bottom:20px"></div>

      <!-- Export -->
      <button class="btn btn-secondary" style="width:100%" id="stats-export-btn">Export wardrobe PDF</button>

    </div>`;

  // ── Most worn ──────────────────────────────────────────────────────────────
  const mwEl = document.getElementById('stats-most-worn');
  if (topWorn.length === 0) {
    mwEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No items worn yet.</p>';
  } else {
    mwEl.innerHTML = topWorn.map((item, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--surface-alt)">
        <span style="font-size:0.75rem;color:var(--text-muted);width:16px;text-align:center;font-weight:700">${i + 1}</span>
        <span style="font-size:1.4rem">${categoryEmoji(item.category)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.name}</div>
          <span class="badge badge-category" style="font-size:0.65rem">${item.category}</span>
        </div>
        <span style="font-size:0.82rem;color:var(--text-muted);font-weight:600;flex-shrink:0">×${item.wear_count}</span>
      </div>`).join('');
  }

  // ── Forgotten ──────────────────────────────────────────────────────────────
  const forgotEl = document.getElementById('stats-forgotten');
  if (forgotten.length === 0) {
    forgotEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No forgotten items — well done!</p>';
  } else {
    const shown = forgotten.slice(0, 8);
    forgotEl.innerHTML = shown.map(item => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--surface-alt)">
        <span style="font-size:1.2rem">${categoryEmoji(item.category)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${item.wear_count === 0 ? 'Never worn' : 'Last worn ' + formatDate(item.last_worn)}</div>
        </div>
        <span class="badge badge-category" style="font-size:0.65rem">${item.category}</span>
      </div>`).join('')
      + (forgotten.length > 8 ? `<p style="font-size:0.78rem;color:var(--text-muted);margin-top:6px">+${forgotten.length - 8} more</p>` : '');
  }

  // ── Not worn in 30 days ────────────────────────────────────────────────────
  const not30El = document.getElementById('stats-not30');
  if (notIn30.length === 0) {
    not30El.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">All recently worn items are up to date.</p>';
  } else {
    const shown = notIn30.slice(0, 6);
    not30El.innerHTML = shown.map(item => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--surface-alt)">
        <span style="font-size:1.2rem">${categoryEmoji(item.category)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">Last worn ${formatDate(item.last_worn)}</div>
        </div>
      </div>`).join('')
      + (notIn30.length > 6 ? `<p style="font-size:0.78rem;color:var(--text-muted);margin-top:6px">+${notIn30.length - 6} more</p>` : '');
  }

  // ── Bar charts ─────────────────────────────────────────────────────────────
  function renderBarChart(elId, data) {
    const el  = document.getElementById(elId);
    const max = data.length > 0 ? data[0][1] : 0;
    if (data.length === 0 || max === 0) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No data yet.</p>';
      return;
    }
    el.innerHTML = data.map(([label, val]) => `
      <div class="bar-row">
        <span class="bar-label" title="${label}">${label}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round((val / max) * 100)}%"></div>
        </div>
        <span class="bar-value">${val}</span>
      </div>`).join('');
  }

  renderBarChart('stats-colour-chart', topColours);
  renderBarChart('stats-cat-chart',    topCats);
  renderBarChart('stats-brand-chart',  topBrands);

  // ── Outfit history mini-calendar ───────────────────────────────────────────
  const calEl  = document.getElementById('stats-cal');
  const year   = today.getFullYear();
  const month  = today.getMonth();
  const firstWeekday  = new Date(year, month, 1).getDay();
  const offset        = (firstWeekday + 6) % 7;
  const daysInMonth   = new Date(year, month + 1, 0).getDate();

  let calHtml = '<div class="calendar-grid">';
  ['Mo','Tu','We','Th','Fr','Sa','Su'].forEach(d => {
    calHtml += `<div class="calendar-day-header">${d}</div>`;
  });
  for (let i = 0; i < offset; i++) {
    calHtml += '<div class="calendar-day other-month"></div>';
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const classes = ['calendar-day'];
    if (dateStr === todayStr)      classes.push('today');
    if (logDateSet.has(dateStr))   classes.push('worn');
    calHtml += `<div class="${classes.join(' ')}">${d}</div>`;
  }
  const trailing = (offset + daysInMonth) % 7 === 0 ? 0 : 7 - ((offset + daysInMonth) % 7);
  for (let i = 1; i <= trailing; i++) {
    calHtml += '<div class="calendar-day other-month"></div>';
  }
  calHtml += '</div>';
  calEl.innerHTML = calHtml;

  // ── Export button ──────────────────────────────────────────────────────────
  document.getElementById('stats-export-btn').addEventListener('click', () => {
    if (typeof exportWardrobePDF === 'function') exportWardrobePDF();
  });
}
