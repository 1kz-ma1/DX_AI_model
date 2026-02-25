// intro.js - シチュエーション選択画面

let charactersData = null;

document.addEventListener('DOMContentLoaded', async () => {
  // シチュエーション（キャラクターデータを流用）を読み込み
  try {
    const response = await fetch('assets/data/characters.json');
    charactersData = await response.json();
    renderSituationGrid();
  } catch (error) {
    console.error('Failed to load characters:', error);
    alert('シチュエーションデータの読み込みに失敗しました');
  }
});

/**
 * シチュエーショングリッドを描画
 */
function renderSituationGrid() {
  const grid = document.getElementById('characterGrid');
  if (!grid || !charactersData) return;
  
  grid.innerHTML = charactersData.characters.map(char => `
    <div class="character-card" data-character-id="${char.id}">
      <div class="character-emoji">${char.emoji}</div>
      <h3 class="character-name">${char.name}</h3>
      <div class="character-role">${char.role}</div>
      <p class="character-description">${char.description}</p>
      
      <div class="character-situation">
        <strong>状況：</strong>
        <p>${char.situation}</p>
      </div>
      
      <div class="character-pain-points">
        <strong>困りごと：</strong>
        <ul>
          ${char.pain_points.map(point => `<li>${point}</li>`).join('')}
        </ul>
      </div>
      
      <div class="domain-priorities">
        <strong>関わる分野：</strong>
        <div class="priority-badges">
          ${Object.entries(char.domains).filter(([_, data]) => data.priority !== 'none').map(([domain, data]) => {
            const domainNames = {
              administration: '行政',
              medical: '医療',
              education: '教育',
              logistics: '物流',
              disaster: '災害'
            };
            const priorityClass = data.priority === 'critical' ? 'critical' : data.priority === 'high' ? 'high' : 'medium';
            return `<span class="priority-badge ${priorityClass}">${domainNames[domain]}</span>`;
          }).join('')}
        </div>
      </div>
      
      <button class="select-character-btn" onclick="selectSituation('${char.id}')">
        このシチュエーションで開始 →
      </button>
    </div>
  `).join('');
}

/**
 * シチュエーションを選択
 */
function selectSituation(situationId) {
  const character = charactersData.characters.find(c => c.id === situationId);
  if (!character) return;
  
  // 視覚的フィードバック
  const card = document.querySelector(`[data-character-id="${situationId}"]`);
  if (card) {
    card.style.transform = 'scale(0.95)';
    card.style.opacity = '0.6';
  }
  
  // プロファイルとして保存（シチュエーション情報を保存）
  const profile = {
    situation: situationId,
    situationLabel: character.situation,
    personaName: character.name,
    timestamp: new Date().toISOString()
  };
  
  saveProfile(profile);
  
  // 少し待ってから遷移（視覚的フィードバックのため）
  setTimeout(() => {
    navigate('strategy.html');
  }, 200);
}
