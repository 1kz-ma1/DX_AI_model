// intro.js - シチュエーション選択画面（ドメイン単位）

let domainsData = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('assets/data/domains.json');
    domainsData = await res.json();
    renderDomainGrid();
  } catch (err) {
    console.error('Failed to load domains:', err);
    alert('シチュエーションデータの読み込みに失敗しました');
  }
});

/**
 * ドメイン（シチュエーション）カードを描画
 */
function renderDomainGrid() {
  const grid = document.getElementById('characterGrid');
  if (!grid || !domainsData || !Array.isArray(domainsData.domains)) return;

  grid.innerHTML = domainsData.domains.map(domain => {
    const disabled = domain.id !== 'medical';
    const disabledClass = disabled ? 'disabled' : '';
    const buttonHtml = disabled
      ? `<button class="select-character-btn disabled" disabled>未実装（準備中）</button>`
      : `<button class="select-character-btn" onclick="selectSituation('${domain.id}')">このシチュエーションで開始 →</button>`;

    return `
      <div class="character-card situation-card ${disabledClass}" data-domain-id="${domain.id}">
        <div class="situation-header">
          <div class="situation-icon">${domain.emoji || '🧩'}</div>
          <h3 class="situation-title">${domain.name}</h3>
        </div>
        <p class="situation-summary">${(domain.description || domain.intro || '').replace(/\n/g,'')}</p>
        <div class="domain-priorities">
          <strong>関わる分野：</strong>
          <div class="priority-badges">
            <span class="priority-badge">${domain.name.replace(/DX/g,'')}</span>
          </div>
        </div>
        ${buttonHtml}
      </div>
    `;
  }).join('');
}

/**
 * シチュエーション（ドメイン）を選択
 */
function selectSituation(domainId) {
  const domain = (domainsData.domains || []).find(d => d.id === domainId);
  if (!domain) return;

  const card = document.querySelector(`[data-domain-id="${domainId}"]`);
  if (card) {
    card.style.transform = 'scale(0.95)';
    card.style.opacity = '0.6';
  }

  const profile = {
    situation: domainId,
    situationLabel: domain.name,
    timestamp: new Date().toISOString()
  };

  saveProfile(profile);

  setTimeout(() => navigate('strategy.html'), 200);
}
