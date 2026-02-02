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
  renderContent();
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
  const modeConfig = currentDomain.modes[currentMode];
  if (!modeConfig) return;
  
  // タイトル・説明
  document.getElementById('modeTitle').textContent = modeConfig.title || '';
  document.getElementById('modeDesc').textContent = modeConfig.description || '';
  
  // 可視化
  renderVisualization();
  
  // 書類カード
  renderDocuments();
  
  // AI対話パネル（AIモードのみ）
  const aiPanel = document.getElementById('aiDialogPanel');
  if (currentMode === 'ai' && currentDomain.aiFlow) {
    aiPanel.style.display = 'block';
    renderAIQuestions();
  } else {
    aiPanel.style.display = 'none';
  }
}

/**
 * 可視化描画
 */
function renderVisualization() {
  const container = document.getElementById('vizCanvas');
  if (!container) return;
  
  // 書類ごとの入力項目集計
  const docs = calculateDocumentStats();
  const vizData = docs.map(doc => ({
    name: doc.name,
    manual: doc.manual,
    auto: doc.auto,
    removed: doc.removed
  }));
  
  renderStackedBar(container, vizData);
}

/**
 * 書類統計計算
 */
function calculateDocumentStats() {
  if (!currentDomain.documents || !currentDomain.documents.base) return [];
  
  return currentDomain.documents.base.map(doc => {
    let manual = 0;
    let auto = 0;
    let removed = 0;
    
    doc.inputFields.forEach(field => {
      // 条件チェック（requiredIfがあれば評価）
      const isRequired = evaluateRequiredIf(field.requiredIf);
      if (!isRequired) {
        removed++;
        return;
      }
      
      // モード別削減判定
      if (shouldBeReduced(field)) {
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

/**
 * 削減判定
 */
function shouldBeReduced(field) {
  const details = field.fieldDetails;
  if (!details) return false;
  
  const source = details.source;
  
  if (currentMode === 'smart') {
    // Smartモード: shared, derived が自動化
    if (source === 'shared' && profile.online) return true;
    if (source === 'derived') return true;
  }
  
  if (currentMode === 'ai') {
    // AIモード: Smart + mynumber + ai
    if (source === 'shared' && profile.online) return true;
    if (source === 'derived') return true;
    if (source === 'mynumber' && profile.myna) return true;
    if (source === 'ai') return true;
  }
  
  return false;
}

/**
 * 書類カード描画
 */
function renderDocuments() {
  const container = document.getElementById('documentsContainer');
  if (!container || !currentDomain.documents || !currentDomain.documents.base) return;
  
  const docs = calculateDocumentStats();
  
  container.innerHTML = docs.map((doc, i) => {
    const original = currentDomain.documents.base[i];
    const totalFields = doc.manual + doc.auto + doc.removed;
    const reductionRate = calculateReductionRate(totalFields, doc.manual);
    
    // チップ生成（ソース別）
    const sourceCounts = {};
    original.inputFields.forEach(field => {
      const source = field.fieldDetails?.source || 'user';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    const chips = Object.entries(sourceCounts)
      .map(([source, count]) => `<span class="chip ${source}">${source} (${count})</span>`)
      .join('');
    
    return `
      <div class="document-card">
        <div class="document-name">${doc.name}</div>
        <div class="document-fields">
          手入力: ${doc.manual} / 自動: ${doc.auto} / 不要: ${doc.removed}
        </div>
        <div class="document-chips">${chips}</div>
        ${reductionRate > 0 ? `<div style="margin-top: 8px; font-size: 0.9rem; color: #10b981; font-weight: bold;">削減率: ${reductionRate}%</div>` : ''}
      </div>
    `;
  }).join('');
}

/**
 * AI質問描画
 */
function renderAIQuestions() {
  const container = document.getElementById('aiQuestions');
  if (!container || !currentDomain.aiFlow || !currentDomain.aiFlow.questions) return;
  
  container.innerHTML = currentDomain.aiFlow.questions.map((q, i) => `
    <div class="ai-question">
      <div class="ai-question-text">${q.text}</div>
      <div class="ai-question-options">
        ${q.options.map((opt, j) => `
          <div class="ai-option">
            <input 
              type="radio" 
              name="ai_q${i}" 
              id="ai_q${i}_${j}" 
              value="${opt.value}"
              ${aiAnswers[q.id] === opt.value ? 'checked' : ''}
              onchange="handleAIAnswer('${q.id}', '${opt.value}')"
            >
            <label for="ai_q${i}_${j}">${opt.label}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/**
 * AI回答ハンドラ
 */
function handleAIAnswer(questionId, value) {
  aiAnswers[questionId] = value;
  // 必要に応じて動的に書類をフィルタ
  renderContent();
}
