/**
 * strategy.js - 戦略ボードのロジック
 */

// ========================================
// Global State
// ========================================
let strategyState = {
  mynumberEnabled: false,
  domainModes: {
    administration: 'plain',
    medical: 'plain',
    education: 'plain',
    logistics: 'plain',
    disaster: 'plain'
  },
  hiddenPoints: {
    administration: false,
    medical: false,
    education: false,
    logistics: false,
    disaster: false,
    complete: false
  }
};

const COSTS = {
  plain: 0,
  smart: 1,
  ai: 2,
  mynumber: 5
};

const INITIAL_POINTS = 6;
const MAX_POINTS = 12;

// 各分野の基本統計（簡易版 - 実際はdomains.jsonから取得）
const DOMAIN_STATS = {
  administration: { totalFields: 135, paperTime: 101 },
  medical: { totalFields: 140, paperTime: 105 },
  education: { totalFields: 140, paperTime: 105 },
  logistics: { totalFields: 130, paperTime: 98 },
  disaster: { totalFields: 145, paperTime: 109 }
};

let domainsData = null;
let charactersData = null;
let selectedCharacter = null;

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  // domains.jsonとcharacters.jsonを読み込み
  await Promise.all([
    loadDomainsData(),
    loadCharactersData()
  ]);
  
  // プロフィールからキャラクター情報を取得
  loadSelectedCharacter();
  
  // localStorageから隠しポイント獲得状況を読み込み
  loadHiddenPoints();
  
  // UI初期化
  initUI();
  
  // 初期計算
  calculateAndUpdate();
});

/**
 * domains.jsonを読み込み
 */
async function loadDomainsData() {
  try {
    const response = await fetch('assets/data/domains.json');
    domainsData = await response.json();
  } catch (error) {
    console.error('Failed to load domains data:', error);
  }
}

/**
 * characters.jsonを読み込み
 */
async function loadCharactersData() {
  try {
    const response = await fetch('assets/data/characters.json');
    charactersData = await response.json();
  } catch (error) {
    console.error('Failed to load characters data:', error);
  }
}

/**
 * 選択されたキャラクター情報を読み込み
 */
function loadSelectedCharacter() {
  const profile = loadProfile();
  if (profile && profile.character && charactersData) {
    const character = charactersData.characters.find(c => c.id === profile.character);
    if (character) {
      selectedCharacter = character;
      // キャラクター固有のデータでDOMAIN_STATSを更新
      updateDomainStatsFromCharacter(character);
      displayCharacterInfo();
      addPriorityBadgesToDomains();
    }
  } else if (!profile || !profile.character) {
    // キャラクター未選択の場合は選択画面へ
    showCharacterRequiredMessage();
  }
}

/**
 * キャラクター固有のデータでDOMAIN_STATSを更新
 */
function updateDomainStatsFromCharacter(character) {
  if (!character || !character.domains) return;
  
  Object.keys(character.domains).forEach(domainId => {
    const domainData = character.domains[domainId];
    if (domainData.fields && domainData.documents) {
      // totalFieldsを更新
      DOMAIN_STATS[domainId].totalFields = domainData.fields;
      
      // paperTime（紙の場合の時間）を計算
      // フィールド数 × 45秒（手書き時間） / 60 = 分単位
      DOMAIN_STATS[domainId].paperTime = Math.round(domainData.fields * 45 / 60);
    }
  });
  
  console.log('DOMAIN_STATS updated with character data:', DOMAIN_STATS);
}

/**
 * キャラクター情報を表示
 */
function displayCharacterInfo() {
  if (!selectedCharacter) return;

  const container = document.querySelector('.strategy-header');
  if (!container) return;

  // キャラクター情報カードを作成
  const characterCard = document.createElement('div');
  characterCard.className = 'character-info-card';
  characterCard.innerHTML = `
    <div class="character-info-header">
      <div class="character-info-emoji">${selectedCharacter.emoji}</div>
      <div class="character-info-text">
        <h3 class="character-info-name">${selectedCharacter.name}</h3>
        <p class="character-info-role">${selectedCharacter.role} (${selectedCharacter.age}歳)</p>
      </div>
    </div>
    <p class="character-info-situation">${selectedCharacter.situation}</p>
    <div class="character-info-priorities">
      ${getPriorityDomainsHTML()}
    </div>
  `;

  // ヘッダーの最初に挿入
  container.insertBefore(characterCard, container.firstChild);
}

/**
 * キャラクターの優先度分野のHTMLを生成
 */
function getPriorityDomainsHTML() {
  if (!selectedCharacter) return '';

  const priorityDomains = [];
  for (const [domainId, domainData] of Object.entries(selectedCharacter.domains)) {
    if (domainData.priority === 'critical' || domainData.priority === 'high') {
      const domainInfo = getDomainInfo(domainId);
      priorityDomains.push({
        id: domainId,
        name: domainInfo.name,
        priority: domainData.priority,
        frequency: domainData.frequency
      });
    }
  }

  if (priorityDomains.length === 0) return '';

  return `
    <div class="priority-info-title">重点分野</div>
    <div class="priority-domains-list">
      ${priorityDomains.map(d => `
        <span class="priority-domain-badge ${d.priority}">
          ${d.name} <span class="priority-frequency">(${d.frequency})</span>
        </span>
      `).join('')}
    </div>
  `;
}

/**
 * 分野情報を取得
 */
function getDomainInfo(domainId) {
  const names = {
    administration: '行政手続き',
    medical: '医療',
    education: '教育',
    logistics: '物流',
    disaster: '防災'
  };
  return { name: names[domainId] || domainId };
}

/**
 * 各分野カードに優先度バッジを追加
 */
function addPriorityBadgesToDomains() {
  if (!selectedCharacter) return;

  Object.entries(selectedCharacter.domains).forEach(([domainId, domainData]) => {
    const priority = domainData.priority;
    if (priority === 'none' || priority === 'low') return;

    const card = document.querySelector(`.domain-card[data-domain="${domainId}"]`);
    if (!card) return;

    const header = card.querySelector('.domain-header');
    if (!header) return;

    // 既存のバッジがあれば削除
    const existingBadge = header.querySelector('.domain-priority-badge');
    if (existingBadge) existingBadge.remove();

    // 優先度バッジを作成
    const badge = document.createElement('span');
    badge.className = `domain-priority-badge ${priority}`;
    
    const priorityText = {
      critical: '⚠️ 重要',
      high: '⭐ 優先',
      medium: '📌 関連'
    }[priority] || '';
    
    badge.innerHTML = `<span class="priority-text">${priorityText}</span>`;
    
    // h3の後に挿入
    const h3 = header.querySelector('h3');
    if (h3) {
      h3.after(badge);
    }

    // 重要度に応じてカードを強調
    if (priority === 'critical') {
      card.style.borderColor = '#ef4444';
      card.style.borderWidth = '3px';
    } else if (priority === 'high') {
      card.style.borderColor = '#f97316';
      card.style.borderWidth = '2px';
    }
  });
}

/**
 * キャラクター未選択時のメッセージ表示
 */
function showCharacterRequiredMessage() {
  const container = document.querySelector('.strategy-header');
  if (!container) return;

  const message = document.createElement('div');
  message.className = 'character-required-message';
  message.innerHTML = `
    <div class="message-icon">⚠️</div>
    <h3>キャラクターを選択してください</h3>
    <p>このシミュレーターを体験するには、まずキャラクターを選択する必要があります。</p>
    <button onclick="navigate('intro.html')" class="back-to-intro-btn">
      キャラクター選択画面へ戻る
    </button>
  `;
  container.insertBefore(message, container.firstChild);
}

/**
 * 隠しポイント獲得状況を読み込み
 */
function loadHiddenPoints() {
  const saved = localStorage.getItem('hiddenPoints');
  if (saved) {
    try {
      strategyState.hiddenPoints = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse hidden points:', e);
    }
  }
  updateHintPanel();
}

/**
 * 隠しポイント獲得状況を保存
 */
function saveHiddenPoints() {
  localStorage.setItem('hiddenPoints', JSON.stringify(strategyState.hiddenPoints));
}

/**
 * UI初期化
 */
function initUI() {
  // キャラクターの優先度を分野カードに表示
  if (selectedCharacter) {
    addPriorityIndicators();
  }
  
  // モード選択ラジオボタンのイベント
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', handleModeChange);
  });
  
  // マイナンバー導入ボタン
  const enableBtn = document.getElementById('enableMynumberBtn');
  if (enableBtn) {
    enableBtn.addEventListener('click', handleMynumberEnable);
  }
  
  // マイナンバー詳細ボタン
  const detailBtn = document.getElementById('mynumberDetailBtn');
  if (detailBtn) {
    detailBtn.addEventListener('click', showMynumberDetail);
  }
  
  // ヒントボタン
  const hintBtn = document.getElementById('hintBtn');
  if (hintBtn) {
    hintBtn.addEventListener('click', toggleHintPanel);
  }
  
  // リセットボタン
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleReset);
  }
  
  // 保存ボタン
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSave);
  }
  
  // 次へボタン
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', handleNext);
  }
  
  // 共有ボタン
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', handleShare);
  }
}

/**
 * 分野カードに優先度インジケーターを追加
 */
function addPriorityIndicators() {
  if (!selectedCharacter) return;

  document.querySelectorAll('.domain-card').forEach(card => {
    const domainId = card.dataset.domain;
    const domainData = selectedCharacter.domains[domainId];
    
    if (!domainData || domainData.priority === 'none' || domainData.priority === 'low') return;

    // 優先度バッジを作成
    const badge = document.createElement('div');
    badge.className = `domain-priority-badge ${domainData.priority}`;
    
    let priorityText = '';
    if (domainData.priority === 'critical') priorityText = '最優先';
    else if (domainData.priority === 'high') priorityText = '重要';
    else if (domainData.priority === 'medium') priorityText = '関連';
    
    badge.innerHTML = `
      <span class="priority-icon">${domainData.priority === 'critical' ? '⚠️' : '✓'}</span>
      <span class="priority-text">${priorityText} (${domainData.frequency})</span>
    `;

    // ドメインヘッダーに追加
    const header = card.querySelector('.domain-header');
    if (header) {
      header.appendChild(badge);
    }
  });
}

/**
 * モード変更ハンドラ
 */
function handleModeChange(event) {
  const input = event.target;
  const domain = input.name.replace('mode-', '');
  const mode = input.value;
  
  strategyState.domainModes[domain] = mode;
  calculateAndUpdate();
}

/**
 * マイナンバー有効化ハンドラ
 */
function handleMynumberEnable() {
  const availablePoints = calculateAvailablePoints();
  
  if (availablePoints < COSTS.mynumber) {
    alert(`ポイントが不足しています。マイナンバー導入には${COSTS.mynumber}ptが必要です。\n現在の利用可能ポイント: ${availablePoints}pt`);
    return;
  }
  
  if (confirm(`マイナンバーシステムを導入しますか？\n\nコスト: ${COSTS.mynumber}pt\n効果: 全分野でmynumber連携が有効になり、AI化の効果が約3倍に向上します。`)) {
    strategyState.mynumberEnabled = true;
    
    // UIを更新
    const card = document.getElementById('mynumberCard');
    const status = document.getElementById('mynumberStatus');
    const btn = document.getElementById('enableMynumberBtn');
    
    if (card) card.classList.add('enabled');
    if (status) {
      status.textContent = '導入済み ✓';
      status.className = 'mynumber-status enabled';
    }
    if (btn) {
      btn.textContent = '✓ 導入済み';
      btn.disabled = true;
    }
    
    // 警告を更新
    updateMynumberWarnings();
    
    // 再計算
    calculateAndUpdate();
    
    // エフェクト表示
    showNotification('💳 マイナンバーシステム導入完了！全分野でAI化の効果が向上しました', 'success');
  }
}

/**
 * マイナンバー詳細表示
 */
function showMynumberDetail() {
  const message = `
💳 マイナンバーシステムについて

【重要】マイナンバーは基盤インフラです
マイナンバー単体では入力削減効果はありません。
各分野をAI化して初めて効果を発揮します。

【導入効果】
・全分野でmynumberソースの項目が自動化
・AI化の削減率が約60% → 93%に向上
・横断的な情報連携により重複入力を排除

【対象項目の例】
・住所、氏名、生年月日
・世帯情報、家族構成
・所得、課税情報
・医療保険、年金情報

【投資対効果】
5ptという高コストですが、全分野に効果があるため、
複数分野をAI化する場合は非常に効率的です。

例: 3分野をAI化する場合
- 未導入: 削減率60% × 3分野 = 時間削減 約150分
- 導入: 削減率93% × 3分野 = 時間削減 約300分
  (+5ptで2倍の効果！)

⚠️ 注意: マイナンバーのみ導入しても効果なし
  `;
  
  alert(message);
}

/**
 * ヒントパネル切り替え
 */
function toggleHintPanel() {
  const panel = document.getElementById('hintPanel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * ヒントパネル更新
 */
function updateHintPanel() {
  const list = document.getElementById('hintList');
  if (!list) return;
  
  const domains = [
    { id: 'administration', name: '行政DX' },
    { id: 'medical', name: '医療DX' },
    { id: 'education', name: '教育DX' },
    { id: 'logistics', name: '物流DX' },
    { id: 'disaster', name: '災害DX' }
  ];
  
  list.innerHTML = domains.map(domain => {
    const unlocked = strategyState.hiddenPoints[domain.id];
    return `
      <li class="${unlocked ? 'hint-unlocked' : 'hint-locked'}">
        ${unlocked ? '✅' : '🔒'} ${domain.name}: ${unlocked ? '獲得済み (+1pt)' : '詳細ページで条件を探索'}
      </li>
    `;
  }).join('');
  
  // 完全制覇ボーナス
  const allUnlocked = domains.every(d => strategyState.hiddenPoints[d.id]);
  const completeUnlocked = strategyState.hiddenPoints.complete;
  
  list.innerHTML += `
    <li class="${completeUnlocked ? 'hint-unlocked' : 'hint-locked'}">
      ${completeUnlocked ? '✅' : '🔒'} 完全制覇ボーナス: ${completeUnlocked ? '獲得済み (+1pt)' : allUnlocked ? '達成可能！' : '全分野のポイント獲得で解放'}
    </li>
  `;
  
  // 全部獲得したら完全制覇ボーナスを自動付与
  if (allUnlocked && !completeUnlocked) {
    strategyState.hiddenPoints.complete = true;
    saveHiddenPoints();
    showNotification('🏆 完全制覇ボーナス獲得！ +1pt', 'success');
    updateHintPanel();
  }
}

/**
 * 利用可能ポイントを計算
 */
function calculateAvailablePoints() {
  let total = INITIAL_POINTS;
  
  // 隠しポイントを追加
  Object.keys(strategyState.hiddenPoints).forEach(key => {
    if (strategyState.hiddenPoints[key]) {
      total += 1;
    }
  });
  
  return total;
}

/**
 * 使用ポイントを計算
 */
function calculateUsedPoints() {
  let used = 0;
  
  // マイナンバー
  if (strategyState.mynumberEnabled) {
    used += COSTS.mynumber;
  }
  
  // 各分野
  Object.values(strategyState.domainModes).forEach(mode => {
    used += COSTS[mode];
  });
  
  return used;
}

/**
 * 計算して全体を更新
 */
function calculateAndUpdate() {
  const availablePoints = calculateAvailablePoints();
  const usedPoints = calculateUsedPoints();
  const remainingPoints = availablePoints - usedPoints;
  
  // ポイント表示更新
  updatePointsDisplay(availablePoints, usedPoints, remainingPoints);
  
  // マイナンバーボタンの有効/無効
  updateMynumberButton(remainingPoints);
  
  // 各分野の効果を計算
  updateDomainEffects();
  
  // ヒストグラム更新
  updateHistogram();
  
  // 総合効果を計算
  updateSummary(usedPoints, remainingPoints);
  
  // マイナンバー警告を更新
  updateMynumberWarnings();
}

/**
 * ポイント表示更新
 */
function updatePointsDisplay(available, used, remaining) {
  const currentEl = document.getElementById('currentPoints');
  const maxEl = document.getElementById('maxPoints');
  const fillEl = document.getElementById('pointsBarFill');
  
  if (currentEl) currentEl.textContent = remaining;
  if (maxEl) maxEl.textContent = available;
  if (fillEl) {
    const percentage = (remaining / available) * 100;
    fillEl.style.width = `${percentage}%`;
    
    // 色を変更
    if (remaining < 0) {
      fillEl.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
    } else if (remaining < 3) {
      fillEl.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
    } else {
      fillEl.style.background = 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)';
    }
  }
}

/**
 * マイナンバーボタンの有効/無効更新
 */
function updateMynumberButton(remainingPoints) {
  const btn = document.getElementById('enableMynumberBtn');
  if (!btn || strategyState.mynumberEnabled) return;
  
  btn.disabled = remainingPoints < COSTS.mynumber;
}

/**
 * 各分野の効果を更新
 */
function updateDomainEffects() {
  Object.keys(strategyState.domainModes).forEach(domain => {
    const mode = strategyState.domainModes[domain];
    const stats = DOMAIN_STATS[domain];
    
    // 削減率を計算
    let reductionRate = 0;
    if (mode === 'plain') {
      reductionRate = 0;
    } else if (mode === 'smart') {
      reductionRate = 0.35; // 約35%削減
    } else if (mode === 'ai') {
      // マイナンバーの有無で変わる
      reductionRate = strategyState.mynumberEnabled ? 0.93 : 0.60;
    }
    
    const manualFields = Math.round(stats.totalFields * (1 - reductionRate));
    const timeMinutes = Math.round(manualFields * 20 / 60);
    
    // 表示更新
    const inputEl = document.getElementById(`effect-${domain}-input`);
    const timeEl = document.getElementById(`effect-${domain}-time`);
    
    if (inputEl) inputEl.textContent = `${manualFields}項目`;
    if (timeEl) timeEl.textContent = `${timeMinutes}分`;
  });
}

/**
 * マイナンバー警告を更新
 */
function updateMynumberWarnings() {
  document.querySelectorAll('.domain-card').forEach(card => {
    const domain = card.dataset.domain;
    const mode = strategyState.domainModes[domain];
    const warning = card.querySelector('.mynumber-warning');
    
    if (warning) {
      warning.style.display = (mode === 'ai' && !strategyState.mynumberEnabled) ? 'block' : 'none';
    }
  });
}

/**
 * ヒストグラムを更新
 */
function updateHistogram() {
  const maxTime = 120; // 最大値を120分に設定
  
  Object.keys(strategyState.domainModes).forEach(domain => {
    const mode = strategyState.domainModes[domain];
    const stats = DOMAIN_STATS[domain];
    
    // 紙の場合の時間（基準）
    const paperTime = stats.paperTime;
    
    // 削減率を計算
    let reductionRate = 0;
    if (mode === 'plain') {
      reductionRate = 0;
    } else if (mode === 'smart') {
      reductionRate = 0.35;
    } else if (mode === 'ai') {
      reductionRate = strategyState.mynumberEnabled ? 0.93 : 0.60;
    }
    
    // 削減時間を計算（紙の時間 - 電子化後の時間）
    const manualFields = Math.round(stats.totalFields * (1 - reductionRate));
    const electronicTime = Math.round(manualFields * 20 / 60);
    const timeSaved = paperTime - electronicTime;
    
    // バーの高さを計算（削減時間が大きいほど高い）
    const heightPercent = Math.min((timeSaved / maxTime) * 100, 100);
    
    // バー要素を取得
    const barEl = document.getElementById(`bar-${domain}`);
    if (barEl) {
      barEl.style.height = `${heightPercent}%`;
      
      // バーの色を設定
      barEl.classList.remove('plain', 'smart', 'ai', 'with-mynumber');
      if (mode === 'plain') {
        barEl.classList.add('plain');
      } else if (mode === 'smart') {
        barEl.classList.add('smart');
      } else if (mode === 'ai') {
        barEl.classList.add('ai');
        if (strategyState.mynumberEnabled) {
          barEl.classList.add('with-mynumber');
        }
      }
      
      // 値を更新
      const valueEl = barEl.querySelector('.bar-value');
      if (valueEl) {
        valueEl.textContent = `${timeSaved}分`;
      }
    }
  });
}

/**
 * 総合効果を更新
 */
function updateSummary(usedPoints, remainingPoints) {
  // 使用ポイント
  const usedEl = document.getElementById('usedPoints');
  const noteEl = document.getElementById('pointsNote');
  
  if (usedEl) usedEl.textContent = `${usedPoints}pt`;
  if (noteEl) {
    if (remainingPoints < 0) {
      noteEl.textContent = `超過 ${Math.abs(remainingPoints)}pt`;
      noteEl.style.color = '#dc2626';
    } else {
      noteEl.textContent = `残り ${remainingPoints}pt`;
      noteEl.style.color = '#6b7280';
    }
  }
  
  // 総入力項目数と時間削減
  let totalInputs = 0;
  let totalPaperTime = 0;
  let totalElectronicTime = 0;
  
  Object.keys(strategyState.domainModes).forEach(domain => {
    const mode = strategyState.domainModes[domain];
    const stats = DOMAIN_STATS[domain];
    
    let reductionRate = 0;
    if (mode === 'smart') reductionRate = 0.35;
    else if (mode === 'ai') reductionRate = strategyState.mynumberEnabled ? 0.93 : 0.60;
    
    const manualFields = Math.round(stats.totalFields * (1 - reductionRate));
    totalInputs += manualFields;
    totalPaperTime += stats.paperTime;
    totalElectronicTime += Math.round(manualFields * 20 / 60);
  });
  
  const timeSaved = totalPaperTime - totalElectronicTime;
  
  const inputsEl = document.getElementById('totalInputs');
  const savedEl = document.getElementById('timeSaved');
  const efficiencyEl = document.getElementById('costEfficiency');
  
  if (inputsEl) inputsEl.textContent = `${totalInputs}項目`;
  if (savedEl) savedEl.textContent = `${timeSaved}分`;
  if (efficiencyEl) {
    const efficiency = usedPoints > 0 ? Math.round(timeSaved / usedPoints) : 0;
    efficiencyEl.textContent = `${efficiency}分/pt`;
  }
  
  // 戦略アドバイス
  updateRecommendation(usedPoints, remainingPoints, timeSaved);
}

/**
 * 戦略アドバイスを更新
 */
function updateRecommendation(usedPoints, remainingPoints, timeSaved) {
  const textEl = document.getElementById('recommendationText');
  if (!textEl) return;
  
  let message = '';
  
  if (remainingPoints < 0) {
    message = '⚠️ ポイントを超過しています。一部の分野をPlainまたはSmartに変更してください。';
  } else if (remainingPoints >= 5 && !strategyState.mynumberEnabled) {
    message = '💡 5pt以上余っています。マイナンバーシステムの導入を検討してみませんか？全分野のAI化効果が大幅に向上します。';
  } else if (remainingPoints >= 3) {
    message = `💡 まだ${remainingPoints}pt余っています。より多くの分野をSmartまたはAI化することで、さらに時間を削減できます。`;
  } else if (timeSaved < 200) {
    message = '💡 各分野の詳細ページで隠しポイントを探索すると、より多くの投資が可能になります。';
  } else if (timeSaved >= 400) {
    message = '🎉 素晴らしい戦略です！市民の時間を大幅に削減できています。この調子で最適化を続けましょう。';
  } else {
    message = '👍 良い戦略です。さらに隠しポイントを獲得して、より多くの分野を改善できます。';
  }
  
  textEl.textContent = message;
}

/**
 * リセットハンドラ
 */
function handleReset() {
  if (confirm('戦略をリセットしますか？\n\n※隠しポイントの獲得状況は保持されます')) {
    strategyState.mynumberEnabled = false;
    strategyState.domainModes = {
      administration: 'plain',
      medical: 'plain',
      education: 'plain',
      logistics: 'plain',
      disaster: 'plain'
    };
    
    // UIリセット
    document.querySelectorAll('input[type="radio"][value="plain"]').forEach(radio => {
      radio.checked = true;
    });
    
    const card = document.getElementById('mynumberCard');
    const status = document.getElementById('mynumberStatus');
    const btn = document.getElementById('enableMynumberBtn');
    
    if (card) card.classList.remove('enabled');
    if (status) {
      status.textContent = '未導入';
      status.className = 'mynumber-status disabled';
    }
    if (btn) {
      btn.textContent = '💳 導入する (5pt)';
      btn.disabled = false;
    }
    
    calculateAndUpdate();
    showNotification('🔄 戦略をリセットしました', 'info');
  }
}

/**
 * 保存ハンドラ
 */
function handleSave() {
  const state = {
    mynumberEnabled: strategyState.mynumberEnabled,
    domainModes: strategyState.domainModes,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('savedStrategy', JSON.stringify(state));
  showNotification('💾 戦略を保存しました', 'success');
}

/**
 * 次へハンドラ（home.htmlへ遷移）
 */
function handleNext() {
  // 戦略を保存
  handleSave();
  
  // ホーム画面（分野一覧）へ遷移
  navigate('home.html');
}

/**
 * 共有ハンドラ
 */
function handleShare() {
  const usedPoints = calculateUsedPoints();
  const availablePoints = calculateAvailablePoints();
  
  // 総効果を計算
  let totalTimeSaved = 0;
  Object.keys(strategyState.domainModes).forEach(domain => {
    const mode = strategyState.domainModes[domain];
    const stats = DOMAIN_STATS[domain];
    
    let reductionRate = 0;
    if (mode === 'smart') reductionRate = 0.35;
    else if (mode === 'ai') reductionRate = strategyState.mynumberEnabled ? 0.93 : 0.60;
    
    const manualFields = Math.round(stats.totalFields * (1 - reductionRate));
    const electronicTime = Math.round(manualFields * 20 / 60);
    totalTimeSaved += stats.paperTime - electronicTime;
  });
  
  const characterInfo = selectedCharacter ? `
👤 体験キャラクター: ${selectedCharacter.name}（${selectedCharacter.role}）
` : '';
  
  const message = `🎮 DX×AI戦略シミュレーター
${characterInfo}
私の戦略:
💰 使用ポイント: ${usedPoints}/${availablePoints}pt
💳 マイナンバー: ${strategyState.mynumberEnabled ? '導入済み' : '未導入'}
⏱️ 時間削減: ${totalTimeSaved}分

各分野の投資:
🏛️ 行政DX: ${strategyState.domainModes.administration.toUpperCase()}
🏥 医療DX: ${strategyState.domainModes.medical.toUpperCase()}
🎓 教育DX: ${strategyState.domainModes.education.toUpperCase()}
📦 物流DX: ${strategyState.domainModes.logistics.toUpperCase()}
🚨 災害対応DX: ${strategyState.domainModes.disaster.toUpperCase()}

#DX #AI #デジタル変革`;
  
  // クリップボードにコピー
  navigator.clipboard.writeText(message).then(() => {
    showNotification('📤 戦略をクリップボードにコピーしました', 'success');
  }).catch(() => {
    alert(message);
  });
}

/**
 * 通知表示
 */
function showNotification(message, type = 'info') {
  // 簡易的な通知表示
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#dcfce7' : type === 'error' ? '#fee2e2' : '#dbeafe'};
    color: ${type === 'success' ? '#166534' : type === 'error' ? '#991b1b' : '#1e40af'};
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// アニメーションのCSSを追加
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
