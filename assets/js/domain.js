/**
 * domain.js - Domain Experience Core Logic
 * 各分野の体験ページのコアロジック
 */

// グローバル状態
let currentDomain = null;
let currentMode = 'plain';
let checklistState = {};
let aiAnswers = {};
let profile = {};
let modeStats = { plain: {}, smart: {}, ai: {} }; // 各モードの統計

/**
 * 初期化
 */
document.addEventListener('DOMContentLoaded', async () => {
  // プロファイル読み込み
  profile = mergeWithProfile();
  
  // URLパラメータから分野IDを取得
  const params = getParams();
  const domainId = params.d;
  
  if (!domainId) {
    alert('分野が指定されていません');
    navigate('home.html');
    return;
  }
  
  // domains.jsonを読み込み
  try {
    const response = await fetch('assets/data/domains.json');
    const domainsData = await response.json();
    currentDomain = domainsData.domains.find(d => d.id === domainId);
    
    if (!currentDomain) {
      alert('指定された分野が見つかりません');
      navigate('home.html');
      return;
    }
    
    // 初期モードを設定（URLパラメータ > デフォルト）
    currentMode = params.mode || domainsData.meta.defaultMode || 'plain';
    
    // UI初期化
    initUI();
    renderProfile();
    renderChecklist();
    
    // 全モードの統計を事前計算
    calculateAllModeStats();
    
    // メトリクス描画
    renderMetricsBar();
    
    // コンテンツ描画
    renderContent();
    
  } catch (error) {
    console.error('Failed to load domain data:', error);
    alert('分野データの読み込みに失敗しました');
    navigate('home.html');
  }
});

/**
 * UI初期化
 */
function initUI() {
  // ヘッダー情報
  document.getElementById('domainEmoji').textContent = currentDomain.emoji;
  document.getElementById('domainName').textContent = currentDomain.name;
  document.getElementById('domainIntro').textContent = currentDomain.description || '';
  
  // ハブに戻るボタン
  document.getElementById('backToHub').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('home.html');
  });
  
  // モード切替ボタン
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    if (btn.dataset.mode === currentMode) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });
  
  // 折りたたみトグル
  const metricsToggle = document.getElementById('metricsToggle');
  if (metricsToggle) {
    metricsToggle.addEventListener('click', () => {
      const container = document.getElementById('metricsContainer');
      const isExpanded = metricsToggle.getAttribute('aria-expanded') === 'true';
      
      if (isExpanded) {
        container.style.display = 'none';
        metricsToggle.setAttribute('aria-expanded', 'false');
      } else {
        container.style.display = 'grid';
        metricsToggle.setAttribute('aria-expanded', 'true');
      }
    });
  }
}

/**
 * プロファイル表示
 */
function renderProfile() {
  const container = document.getElementById('profileDisplay');
  if (!container) return;
  
  const items = [
    { label: 'マイナカード', value: profile.myna ? 'あり' : 'なし' },
    { label: 'オンライン申請', value: profile.online ? '可能' : '不可' },
    { label: '同意まとめ', value: profile.consent_unify ? 'あり' : 'なし' },
    { label: 'ペルソナ', value: profile.persona || '指定なし' }
  ];
  
  container.innerHTML = items.map(item => `
    <div class="profile-item">
      <span>${item.label}:</span>
      <strong>${item.value}</strong>
    </div>
  `).join('');
}

/**
 * チェックリスト描画
 */
function renderChecklist() {
  const container = document.getElementById('checklistContainer');
  if (!container || !currentDomain.checklist) return;
  
  container.innerHTML = currentDomain.checklist.map(item => `
    <div class="checklist-item">
      <input 
        type="checkbox" 
        id="check_${item.id}" 
        ${checklistState[item.id] ? 'checked' : ''}
        onchange="handleChecklistChange('${item.id}')"
      >
      <label for="check_${item.id}">${item.label}</label>
    </div>
  `).join('');
}

/**
 * チェックリスト変更ハンドラ
 */
function handleChecklistChange(itemId) {
  const checkbox = document.getElementById(`check_${itemId}`);
  checklistState[itemId] = checkbox.checked;
  
  // 統計再計算
  calculateAllModeStats();
  renderMetricsBar();
  renderContent();
}

/**
 * 全モードの統計を計算
 */
function calculateAllModeStats() {
  ['plain', 'smart', 'ai'].forEach(mode => {
    const stats = calculateStatsForMode(mode);
    modeStats[mode] = stats;
  });
}

/**
 * 特定モードの統計を計算
 */
function calculateStatsForMode(mode) {
  if (!currentDomain.documents || !currentDomain.documents.base) {
    return { totalDocs: 0, totalInput: 0 };
  }
  
  let totalDocs = 0;
  let totalManual = 0;
  let totalAuto = 0;
  let totalRemoved = 0;
  
  currentDomain.documents.base.forEach(doc => {
    let hasRequiredFields = false;
    let manual = 0;
    let auto = 0;
    let removed = 0;
    
    doc.inputFields.forEach(field => {
      const isRequired = evaluateRequiredIf(field.requiredIf);
      if (!isRequired) {
        removed++;
        return;
      }
      
      hasRequiredFields = true;
      
      if (shouldBeReducedInMode(field, mode)) {
        auto++;
      } else {
        manual++;
      }
    });
    
    if (hasRequiredFields) {
      totalDocs++;
    }
    totalManual += manual;
    totalAuto += auto;
    totalRemoved += removed;
  });
  
  return {
    totalDocs,
    totalInput: totalManual,
    totalManual,
    totalAuto,
    totalRemoved
  };
}

/**
 * モード別削減判定
 */
function shouldBeReducedInMode(field, mode) {
  // sourceを取得（field.source または field.fieldDetails.source）
  const source = field.source || field.fieldDetails?.source;
  
  if (!source) return false;
  
  if (mode === 'plain') {
    // Plainモードは全て手入力
    return false;
  }
  
  if (mode === 'smart') {
    // Smartモード: shared, derived が自動化
    if (source === 'shared' && profile.online) return true;
    if (source === 'derived') return true;
  }
  
  if (mode === 'ai') {
    // AIモード: Smart + mynumber + ai
    if (source === 'shared' && profile.online) return true;
    if (source === 'derived') return true;
    if (source === 'mynumber' && profile.myna) return true;
    if (source === 'ai') return true;
  }
  
  return false;
}

/**
 * メトリクス比較バー描画
 */
function renderMetricsBar() {
  const plainStats = modeStats.plain;
  const smartStats = modeStats.smart;
  const aiStats = modeStats.ai;
  
  // 最大値を計算（スケール用）
  const maxDocs = Math.max(plainStats.totalDocs, smartStats.totalDocs, aiStats.totalDocs) || 1;
  const maxInput = Math.max(plainStats.totalInput, smartStats.totalInput, aiStats.totalInput) || 1;
  
  // 提出書類
  updateMetricBar('metricDocsPlain', 'metricDocsPlainValue', plainStats.totalDocs, maxDocs);
  updateMetricBar('metricDocsSmart', 'metricDocsSmartValue', smartStats.totalDocs, maxDocs);
  updateMetricBar('metricDocsAi', 'metricDocsAiValue', aiStats.totalDocs, maxDocs);
  
  // 入力項目
  updateMetricBar('metricInputPlain', 'metricInputPlainValue', plainStats.totalInput, maxInput);
  updateMetricBar('metricInputSmart', 'metricInputSmartValue', smartStats.totalInput, maxInput);
  updateMetricBar('metricInputAi', 'metricInputAiValue', aiStats.totalInput, maxInput);
}

/**
 * メトリクスバーを更新
 */
function updateMetricBar(barId, valueId, value, maxValue) {
  const barElement = document.getElementById(barId);
  const valueElement = document.getElementById(valueId);
  
  if (barElement && valueElement) {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    barElement.style.width = `${percentage}%`;
    valueElement.textContent = value;
  }
}

/**
 * モード切替
 */
function switchMode(mode) {
  currentMode = mode;
  
  // ボタンの状態更新
  document.querySelectorAll('.mode-btn').forEach(btn => {
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });
  
  // URLパラメータ更新
  setParams({ mode }, true);
  
  // コンテンツ再描画
  renderContent();
}

/**
 * コンテンツ描画
 */
function renderContent() {
  // 全パネルを非表示
  document.querySelectorAll('.result-panel').forEach(panel => panel.style.display = 'none');
  
  // 統計パネルの表示/非表示
  const statsPanel = document.getElementById('statsPanel');
  if (statsPanel) {
    statsPanel.style.display = currentMode === 'summary' ? 'none' : 'block';
  }
  
  if (currentMode === 'summary') {
    // Summaryモード
    renderSummaryMode();
  } else {
    // Plain/Smart/AIモード
    const modeConfig = currentDomain.modes[currentMode];
    if (!modeConfig) return;
    
    // タイトル・説明
    document.getElementById('modeTitle').textContent = modeConfig.title || '';
    document.getElementById('modeDesc').textContent = modeConfig.description || '';
    
    // 対応するパネルを表示
    const panel = document.getElementById(`${currentMode}Result`);
    if (panel) {
      panel.style.display = 'block';
      renderModeContent(currentMode);
    }
    
    // 統計情報更新
    updateStatsPanel();
  }
}

/**
 * モード別コンテンツ描画
 */
function renderModeContent(mode) {
  const stats = calculateDocumentStatsForMode(mode);
  const containerId = `${mode}Documents`;
  const container = document.getElementById(containerId);
  
  if (!container) return;
  
  container.innerHTML = stats.map((doc) => {
    const totalFields = doc.manual + doc.auto + doc.removed;
    const reductionRate = calculateReductionRate(totalFields, doc.manual);
    
    return `
      <div class="document-card" style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 12px;">
        <div style="font-weight: 700; font-size: 1rem; margin-bottom: 8px;">${doc.name}</div>
        <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 8px;">
          手入力: ${doc.manual} / 自動: ${doc.auto} / 不要: ${doc.removed}
        </div>
        ${reductionRate > 0 ? `<div style="font-size: 0.875rem; color: #10b981; font-weight: 600;">削減率: ${reductionRate}%</div>` : ''}
      </div>
    `;
  }).join('');
  
  // AIモードの特別処理
  if (mode === 'ai') {
    const hypothesisPanel = document.getElementById('aiHypothesisPanel');
    const branchPanel = document.getElementById('aiBranchQuestions');
    const confirmPanel = document.getElementById('aiConfirmLog');
    const docsPanel = document.getElementById('aiDocumentsPanel');
    
    if (hypothesisPanel) hypothesisPanel.style.display = 'none';
    if (branchPanel) branchPanel.style.display = 'none';
    if (confirmPanel) confirmPanel.style.display = 'none';
    if (docsPanel) docsPanel.style.display = 'block';
  }
  
  // Smartモードの警告
  if (mode === 'smart') {
    const warningsSection = document.getElementById('smartWarningsSection');
    if (warningsSection) {
      // 簡易実装: 警告は非表示
      warningsSection.style.display = 'none';
    }
  }
}

/**
 * Summaryモード描画
 */
function renderSummaryMode() {
  const panel = document.getElementById('summaryResult');
  if (!panel) return;
  
  panel.style.display = 'block';
  
  // タイトル更新
  document.getElementById('modeTitle').textContent = '📊 全体のまとめ';
  document.getElementById('modeDesc').textContent = 'Plain、Smart、AIの3モードを比較して、DX×AIの効果を確認できます。';
  
  // 積み上げ棒グラフ描画
  const vizData = [];
  ['plain', 'smart', 'ai'].forEach(mode => {
    const stats = modeStats[mode];
    const modeLabel = mode === 'plain' ? 'Plain（電子化）' : mode === 'smart' ? 'Smart（工夫）' : 'AI（AI導入）';
    vizData.push({
      name: modeLabel,
      manual: stats.totalManual || 0,
      auto: stats.totalAuto || 0,
      removed: stats.totalRemoved || 0
    });
  });
  
  const vizCanvas = document.getElementById('summaryVizCanvas');
  if (vizCanvas) {
    renderStackedBar(vizCanvas, vizData);
  }
  
  // 統計サマリー
  const plainStats = modeStats.plain;
  const smartStats = modeStats.smart;
  const aiStats = modeStats.ai;
  
  if (document.getElementById('summaryDocsPlain')) {
    document.getElementById('summaryDocsPlain').textContent = plainStats.totalDocs || 0;
    document.getElementById('summaryDocsSmart').textContent = smartStats.totalDocs || 0;
    document.getElementById('summaryDocsAi').textContent = aiStats.totalDocs || 0;
    
    document.getElementById('summaryInputPlain').textContent = plainStats.totalInput || 0;
    document.getElementById('summaryInputSmart').textContent = smartStats.totalInput || 0;
    document.getElementById('summaryInputAi').textContent = aiStats.totalInput || 0;
  }
  
  // 削減効果
  const docsReduction = calculateReductionRate(plainStats.totalDocs, aiStats.totalDocs);
  const inputReduction = calculateReductionRate(plainStats.totalInput, aiStats.totalInput);
  
  if (document.getElementById('summaryDocsReduction')) {
    document.getElementById('summaryDocsReduction').textContent = `${docsReduction}%`;
    document.getElementById('summaryInputReduction').textContent = `${inputReduction}%`;
  }
}

/**
 * 統計パネル更新
 */
function updateStatsPanel() {
  const stats = modeStats[currentMode];
  const statsElement = document.getElementById('docStats');
  
  if (statsElement && stats) {
    statsElement.textContent = `提出書類: ${stats.totalDocs}件 / 入力項目: ${stats.totalInput}項目`;
  }
}

/**
 * モード別書類統計計算
 */
function calculateDocumentStatsForMode(mode) {
  if (!currentDomain.documents || !currentDomain.documents.base) return [];
  
  return currentDomain.documents.base.map(doc => {
    let manual = 0;
    let auto = 0;
    let removed = 0;
    
    doc.inputFields.forEach(field => {
      const isRequired = evaluateRequiredIf(field.requiredIf);
      if (!isRequired) {
        removed++;
        return;
      }
      
      if (shouldBeReducedInMode(field, mode)) {
        auto++;
      } else {
        manual++;
      }
    });
    
    return { name: doc.name, manual, auto, removed };
  });
}

/**
 * requiredIf条件評価
 */
function evaluateRequiredIf(condition) {
  if (!condition) return true; // 条件なしは常に必須
  
  // 簡易実装: checklistStateを参照
  // 例: "emergency" → checklistState.emergency === true
  return checklistState[condition] === true;
}
