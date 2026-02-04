/**
 * domain.js - Domain Experience Core Logic
 * 各分野の体験ページのコアロジック
 */

// グローバル状態
let currentDomain = null;
let currentDomainOriginal = null; // オリジナルの完全データを保持
let currentMode = 'plain';
let experienceMode = 'game'; // 'game' または 'demo' - 初期化時にURLパラメータで上書き
let checklistState = {};
let aiAnswers = {};
let profile = {};
let modeStats = { plain: {}, smart: {}, ai: {} }; // 各モードの統計

// 時間推定定数（1フィールドあたりの秒数）
const TIME_ESTIMATES = {
  paper: 45,      // 紙の書類: 手書き、消しゴム、辞書参照、書き直し
  electronic: 20, // 電子入力: タイピング（手入力フィールドのみ）
  auto: 0         // 自動入力: 時間不要
};

/**
 * 初期化
 */
document.addEventListener('DOMContentLoaded', async () => {
  // プロファイル読み込み
  profile = mergeWithProfile();
  
  // URLパラメータから分野IDとexperienceModeを取得
  const params = getParams();
  const domainId = params.d;
  
  // experienceModeをURLパラメータから取得（デフォルトは'game'）
  if (params.experience === 'demo') {
    experienceMode = 'demo';
  } else {
    experienceMode = 'game';
  }
  
  if (!domainId) {
    alert('分野が指定されていません');
    navigate('home.html');
    return;
  }
  
  // domains.jsonを読み込み
  try {
    const response = await fetch('assets/data/domains.json');
    const domainsData = await response.json();
    currentDomainOriginal = domainsData.domains.find(d => d.id === domainId);
    
    if (!currentDomainOriginal) {
      alert('指定された分野が見つかりません');
      navigate('home.html');
      return;
    }
    
    // experienceModeに応じてデータを設定
    if (experienceMode === 'demo') {
      // デモモード: 完全データを使用
      currentDomain = JSON.parse(JSON.stringify(currentDomainOriginal));
    } else {
      // ゲームモード: 簡略化データを使用
      currentDomain = createSimplifiedDomain(currentDomainOriginal);
    }
    
    // 初期モードを設定（URLパラメータ > デフォルト）
    currentMode = params.mode || domainsData.meta.defaultMode || 'plain';
    
    // UI初期化
    initUI();
    renderProfile();
    
    // 全モードの統計を事前計算
    calculateAllModeStats();
    
    // メトリクス描画
    renderMetricsBar();
    
    // コンテンツ描画
    renderContent();
    
    // 隠しポイントチャレンジの初期化
    initHiddenPointChallenge();
    
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
  
  // デモモード時は体験モード選択セクション全体を非表示
  const experienceModeSelector = document.getElementById('experienceModeSelector');
  if (experienceMode === 'demo') {
    if (experienceModeSelector) {
      experienceModeSelector.style.display = 'none';
    }
    // 体験モード切り替えボタンも全削除
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.style.display = 'none');
    return;
  }
  
  // 分野一覧に戻るボタン
  document.getElementById('backToHub').addEventListener('click', (e) => {
    e.preventDefault();
    // experienceModeを保持して遷移
    navigate('home.html', { experience: experienceMode });
  });
  
  // 体験モード切り替えボタン
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    // 初期状態を設定
    if (btn.dataset.experience === experienceMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
    
    btn.addEventListener('click', () => {
      const newMode = btn.dataset.experience;
      switchExperienceMode(newMode);
    });
  });
  
  // 説明文の初期表示を設定
  document.querySelectorAll('.description-content').forEach(desc => {
    desc.classList.remove('active');
  });
  const initialDesc = document.getElementById(experienceMode === 'game' ? 'gameDescription' : 'demoDescription');
  if (initialDesc) initialDesc.classList.add('active');
  
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
  
  // デモモード時：分野クリック→分析ページへのイベントリスナー追加
  if (experienceMode === 'demo') {
    const domainHeaderLink = document.querySelector('.domain-header');
    if (domainHeaderLink) {
      domainHeaderLink.style.cursor = 'pointer';
      domainHeaderLink.addEventListener('click', (e) => {
        // ボタンではなくヘッダークリック時のみ反応
        if (e.target.closest('button') || e.target.closest('nav')) return;
        navigateToAnalysis();
      });
    }
  }
  
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
 * デモモード：分析ページへナビゲート
 */
function navigateToAnalysis() {
  console.log('navigateToAnalysis() called');
  console.log(`Current mode: ${currentMode}, Current domain: ${currentDomain?.id}`);
  navigate('home.html', { 
    experience: 'demo',
    open: 'analysis'
  });
}

/**
 * プロファイル表示
 */
function renderProfile() {
  const container = document.getElementById('profileDisplay');
  if (!container) return;
  
  // デモモード時はペルソナ情報全体を非表示
  const profileSection = container.closest('.profile-section');
  if (experienceMode === 'demo') {
    if (profileSection) {
      profileSection.style.display = 'none';
    }
    return;
  }
  
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
 * チェックリスト描画（削除済み）
 */
function renderChecklist() {
  // チェックリストは削除されました
}

/**
 * 体験モード切り替え
 */
function switchExperienceMode(mode) {
  if (experienceMode === mode) return;
  
  experienceMode = mode;
  
  // ボタンのアクティブ状態を更新
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    if (btn.dataset.experience === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // 説明文の切り替え
  document.querySelectorAll('.description-content').forEach(desc => {
    desc.classList.remove('active');
  });
  const activeDesc = document.getElementById(mode === 'game' ? 'gameDescription' : 'demoDescription');
  if (activeDesc) activeDesc.classList.add('active');
  
  // データを切り替え
  if (mode === 'game') {
    // ゲームモード: データを簡略化
    currentDomain = createSimplifiedDomain(currentDomainOriginal);
  } else {
    // デモモード: 完全なデータ
    currentDomain = JSON.parse(JSON.stringify(currentDomainOriginal));
  }
  
  // 再レンダリング
  calculateAllModeStats();
  renderMetricsBar();
  renderContent();
  
  // 通知表示
  const modeLabel = mode === 'game' ? '🎮 ゲームモード' : '📊 デモモード';
  showNotification(`${modeLabel}に切り替えました`, 'info');
}

/**
 * 簡略化されたドメインデータを作成
 */
function createSimplifiedDomain(originalDomain) {
  const simplified = JSON.parse(JSON.stringify(originalDomain));
  
  // 書類を3-5件に削減
  if (simplified.documents && simplified.documents.base) {
    const reducedDocs = simplified.documents.base.slice(0, 5);
    
    // 各書類の入力フィールドも削減（3-5項目程度）
    reducedDocs.forEach(doc => {
      if (doc.inputFields && doc.inputFields.length > 5) {
        // 各ソースタイプからバランスよく残す
        const bySource = {};
        doc.inputFields.forEach(field => {
          if (!bySource[field.source]) bySource[field.source] = [];
          bySource[field.source].push(field);
        });
        
        // 各ソースから1-2項目ずつ取る
        const balanced = [];
        Object.values(bySource).forEach(fields => {
          balanced.push(...fields.slice(0, 2));
        });
        
        doc.inputFields = balanced.slice(0, 5);
      }
    });
    
    simplified.documents.base = reducedDocs;
  }
  
  return simplified;
}

/**
 * チェックリスト変更ハンドラ（削除済み）
 */
function handleChecklistChange(itemId) {
  // チェックリストは削除されました
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
  
  // 時間推定を計算（分単位）
  const totalFields = totalManual + totalAuto;
  const paperTimeMinutes = Math.round(totalFields * TIME_ESTIMATES.paper / 60);
  const electronicTimeMinutes = Math.round(totalManual * TIME_ESTIMATES.electronic / 60);
  const timeSavedMinutes = paperTimeMinutes - electronicTimeMinutes;
  const reductionRate = totalFields > 0 ? Math.round((totalAuto / totalFields) * 100) : 0;
  
  return {
    totalDocs,
    totalInput: totalManual,
    totalManual,
    totalAuto,
    totalRemoved,
    paperTime: paperTimeMinutes,
    electronicTime: electronicTimeMinutes,
    timeSaved: timeSavedMinutes,
    reductionRate: reductionRate
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
  const maxTime = plainStats.paperTime || 1;
  
  // 提出書類
  updateMetricBar('metricDocsPlain', 'metricDocsPlainValue', plainStats.totalDocs, maxDocs, '件');
  updateMetricBar('metricDocsSmart', 'metricDocsSmartValue', smartStats.totalDocs, maxDocs, '件');
  updateMetricBar('metricDocsAi', 'metricDocsAiValue', aiStats.totalDocs, maxDocs, '件');
  
  // 入力項目
  updateMetricBar('metricInputPlain', 'metricInputPlainValue', plainStats.totalInput, maxInput, '項目');
  updateMetricBar('metricInputSmart', 'metricInputSmartValue', smartStats.totalInput, maxInput, '項目');
  updateMetricBar('metricInputAi', 'metricInputAiValue', aiStats.totalInput, maxInput, '項目');
  
  // 推定時間
  updateMetricBar('metricTimePaper', 'metricTimePaperValue', plainStats.paperTime, maxTime, '分');
  updateMetricBar('metricTimePlain', 'metricTimePlainValue', plainStats.electronicTime, maxTime, '分');
  updateMetricBar('metricTimeSmart', 'metricTimeSmartValue', smartStats.electronicTime, maxTime, '分');
  updateMetricBar('metricTimeAi', 'metricTimeAiValue', aiStats.electronicTime, maxTime, '分');
}

/**
 * メトリクスバーを更新
 */
function updateMetricBar(barId, valueId, value, maxValue, unit = '') {
  const barElement = document.getElementById(barId);
  const valueElement = document.getElementById(valueId);
  
  if (barElement && valueElement) {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    barElement.style.width = `${percentage}%`;
    valueElement.textContent = unit ? `${value}${unit}` : value;
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
    
    // 時間データ
    document.getElementById('summaryTimePaper').textContent = `${plainStats.paperTime || 0}分`;
    document.getElementById('summaryTimePlain').textContent = `${plainStats.electronicTime || 0}分`;
    document.getElementById('summaryTimeSmart').textContent = `${smartStats.electronicTime || 0}分`;
    document.getElementById('summaryTimeAi').textContent = `${aiStats.electronicTime || 0}分`;
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

// ========================================
// 隠しポイントシステム
// ========================================

/**
 * 隠しポイントチャレンジの初期化
 */
function initHiddenPointChallenge() {
  if (!currentDomain) return;
  
  // 既に獲得済みかチェック
  const hiddenPoints = JSON.parse(localStorage.getItem('hiddenPoints') || '{}');
  if (hiddenPoints[currentDomain.id]) {
    return; // 既に獲得済みなら何もしない
  }
  
  // チャレンジ説明を表示
  const challenge = HIDDEN_POINT_CHALLENGES[currentDomain.id];
  if (challenge) {
    const challengeDiv = document.getElementById('hiddenPointChallenge');
    const descriptionEl = document.getElementById('challengeDescription');
    
    if (challengeDiv && descriptionEl) {
      descriptionEl.textContent = challenge.description;
      challengeDiv.style.display = 'block';
      challengeDiv.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)';
      challengeDiv.style.borderColor = '#818cf8';
      
      // ボタンを非表示（条件達成時に表示）
      const btnEl = document.getElementById('unlockPointBtn');
      if (btnEl) {
        btnEl.style.display = 'none';
      }
    }
  }
  
  // 初回チェック
  checkHiddenPointChallenge();
}

/**
 * 隠しポイントのチャレンジ条件を定義
 */
const HIDDEN_POINT_CHALLENGES = {
  administration: {
    description: '全てのモード（Plain/Smart/AI/Summary）を確認すると、隠しポイントを獲得できます',
    checkCondition: () => {
      const viewHistory = JSON.parse(localStorage.getItem('viewHistory_administration') || '{}');
      return viewHistory.plain && viewHistory.smart && viewHistory.ai && viewHistory.summary;
    }
  },
  medical: {
    description: '全てのモード（Plain/Smart/AI）を確認すると、隠しポイントを獲得できます',
    checkCondition: () => {
      const viewHistory = JSON.parse(localStorage.getItem('viewHistory_medical') || '{}');
      return viewHistory.plain && viewHistory.smart && viewHistory.ai;
    }
  },
  education: {
    description: 'AIモードとSummaryモードの両方を確認すると、隠しポイントを獲得できます',
    checkCondition: () => {
      const viewHistory = JSON.parse(localStorage.getItem('viewHistory_education') || '{}');
      return viewHistory.ai && viewHistory.summary;
    }
  },
  logistics: {
    description: 'Smart と AI モードの違いを比較（両方確認）すると、隠しポイントを獲得できます',
    checkCondition: () => {
      const viewHistory = JSON.parse(localStorage.getItem('viewHistory_logistics') || '{}');
      return viewHistory.smart && viewHistory.ai;
    }
  },
  disaster: {
    description: 'Summaryモードで4つのモードの効果を比較すると、隠しポイントを獲得できます',
    checkCondition: () => {
      const viewHistory = JSON.parse(localStorage.getItem('viewHistory_disaster') || '{}');
      return viewHistory.summary;
    }
  }
};

/**
 * 閲覧履歴を記録
 */
function recordModeView(mode) {
  if (!currentDomain) return;
  
  const key = `viewHistory_${currentDomain.id}`;
  const history = JSON.parse(localStorage.getItem(key) || '{}');
  history[mode] = true;
  localStorage.setItem(key, JSON.stringify(history));
  
  // チャレンジチェック
  checkHiddenPointChallenge();
}

/**
 * 隠しポイントチャレンジをチェック
 */
function checkHiddenPointChallenge() {
  if (!currentDomain) return;
  
  const challenge = HIDDEN_POINT_CHALLENGES[currentDomain.id];
  if (!challenge) return;
  
  // 既に獲得済みかチェック
  const hiddenPoints = JSON.parse(localStorage.getItem('hiddenPoints') || '{}');
  if (hiddenPoints[currentDomain.id]) {
    return; // 既に獲得済み
  }
  
  // 条件達成チェック
  if (challenge.checkCondition()) {
    showHiddenPointChallenge();
  }
}

/**
 * 隠しポイントチャレンジUIを表示
 */
function showHiddenPointChallenge() {
  const challengeDiv = document.getElementById('hiddenPointChallenge');
  const descriptionEl = document.getElementById('challengeDescription');
  const btnEl = document.getElementById('unlockPointBtn');
  
  if (!challengeDiv || !descriptionEl || !btnEl) return;
  
  const challenge = HIDDEN_POINT_CHALLENGES[currentDomain.id];
  descriptionEl.textContent = '🎉 おめでとうございます！チャレンジ条件を達成しました。';
  
  // ボタンを表示
  btnEl.style.display = 'inline-block';
  
  // スタイルを成功モードに変更
  challengeDiv.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
  challengeDiv.style.borderColor = '#f59e0b';
  challengeDiv.style.display = 'block';
  
  // スクロールして表示
  challengeDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // ボタンイベント
  btnEl.onclick = () => {
    unlockHiddenPoint();
  };
}

/**
 * 隠しポイントを獲得
 */
function unlockHiddenPoint() {
  if (!currentDomain) return;
  
  const hiddenPoints = JSON.parse(localStorage.getItem('hiddenPoints') || '{}');
  hiddenPoints[currentDomain.id] = true;
  localStorage.setItem('hiddenPoints', JSON.stringify(hiddenPoints));
  
  // 通知表示
  showPointNotification(`🎁 +1pt 獲得！\n${currentDomain.name}の隠しポイントをアンロックしました`);
  
  // チャレンジUIを非表示
  const challengeDiv = document.getElementById('hiddenPointChallenge');
  if (challengeDiv) {
    challengeDiv.style.display = 'none';
  }
  
  // 完全制覇チェック
  checkCompleteBonus();
}

/**
 * 完全制覇ボーナスをチェック
 */
function checkCompleteBonus() {
  const hiddenPoints = JSON.parse(localStorage.getItem('hiddenPoints') || '{}');
  const allDomains = ['administration', 'medical', 'education', 'logistics', 'disaster'];
  
  const allUnlocked = allDomains.every(domain => hiddenPoints[domain]);
  
  if (allUnlocked && !hiddenPoints.complete) {
    hiddenPoints.complete = true;
    localStorage.setItem('hiddenPoints', JSON.stringify(hiddenPoints));
    showPointNotification('🏆 完全制覇ボーナス！ +1pt\n全分野の隠しポイントを獲得しました');
  }
}

/**
 * ポイント獲得通知を表示
 */
function showPointNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 2rem 3rem;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 3px solid #f59e0b;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 10000;
    font-size: 1.5rem;
    font-weight: 700;
    color: #92400e;
    text-align: center;
    animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    white-space: pre-line;
  `;
  notification.textContent = message;
  
  // 背景オーバーレイ
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(notification);
  
  // 3秒後に消す
  setTimeout(() => {
    notification.style.animation = 'popOut 0.3s ease';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      notification.remove();
      overlay.remove();
    }, 300);
  }, 3000);
  
  // クリックで即座に消す
  overlay.onclick = () => {
    notification.remove();
    overlay.remove();
  };
}

// アニメーションのCSSを追加
const style = document.createElement('style');
style.textContent = `
  @keyframes popIn {
    from {
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
    }
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }
  
  @keyframes popOut {
    from {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    to {
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
    }
  }
  
  .unlock-point-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
  }
`;
document.head.appendChild(style);

/**
 * モード切替時に閲覧履歴を記録（既存のswitchMode関数を拡張）
 */
const originalSwitchMode = window.switchMode;
window.switchMode = function(mode) {
  originalSwitchMode.call(this, mode);
  recordModeView(mode);
};

