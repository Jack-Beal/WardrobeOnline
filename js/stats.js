// Stats tab — wear counts, forgotten items, colour charts. (Feature 10)

function loadStats() {
  const container = document.getElementById('stats-container');
  container.innerHTML = `
    <div class="empty-state">
      <span class="empty-state-icon">📊</span>
      <p class="empty-state-title">Stats coming soon</p>
      <p class="empty-state-desc">See wear counts, forgotten items, and more.</p>
    </div>`;
}
