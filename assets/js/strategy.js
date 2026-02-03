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

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  // domains.jsonを読み込み
  await loadDomainsData();
  
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
  
  // 共有ボタン
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', handleShare);
  }
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
- 未導入: 削減率60% × 3分野
- 導入: 削減率93% × 3分野（+5ptで約2倍の効果）
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
  
  const message = `🎮 DX×AI戦略シミュレーター

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
