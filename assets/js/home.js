// home.js - 分野選択画面のレンダリング（リング/グリッド）

let charactersData = null;
let experienceMode = 'game'; // URLパラメータから取得
let domainModes = {}; // デモモード時の各分野のモード状態
let isCustomMode = false; // カスタムプランモードかどうか

// プラン定義
const PLANS = {
  plain: {
    name: '最小デジタル化プラン',
    modes: { administration: 'plain', medical: 'plain', insurance: 'plain', education: 'plain', logistics: 'plain', disaster: 'plain', tax: 'plain', welfare: 'plain', infrastructure: 'plain' }
  },
  cost: {
    name: 'コスト重視',
    modes: { administration: 'smart', medical: 'smart', insurance: 'plain', education: 'plain', logistics: 'plain', disaster: 'plain', tax: 'smart', welfare: 'plain', infrastructure: 'plain' }
  },
  basic: {
    name: '基本プラン',
    modes: { administration: 'smart', medical: 'plain', insurance: 'smart', education: 'plain', logistics: 'smart', disaster: 'plain', tax: 'smart', welfare: 'plain', infrastructure: 'smart' }
  },
  recommended: {
    name: '推奨プラン',
    modes: { administration: 'ai', medical: 'ai', insurance: 'smart', education: 'smart', logistics: 'smart', disaster: 'smart', tax: 'smart', welfare: 'smart', infrastructure: 'smart' }
  },
  emergency: {
    name: '緊急対応優先',
    modes: { administration: 'ai', medical: 'ai', insurance: 'ai', education: 'plain', logistics: 'smart', disaster: 'ai', tax: 'ai', welfare: 'ai', infrastructure: 'smart' }
  },
  advanced: {
    name: '最先端プラン',
    modes: { administration: 'ai', medical: 'ai', insurance: 'ai', education: 'ai', logistics: 'ai', disaster: 'ai', tax: 'ai', welfare: 'ai', infrastructure: 'ai' }
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // URLパラメータからexperienceModeを取得
    const params = getParams();
    if (params.experience === 'demo') {
      experienceMode = 'demo';
      // デモモード時はペルソナをクリア
      const profile = loadProfile() || {};
      profile.character = null;
      saveProfile(profile);

      // デモモード時は戦略ボード導線を非表示
      const strategyBanner = document.getElementById('strategyBoardBanner');
      if (strategyBanner) {
        strategyBanner.style.display = 'none';
      }
    }
    
    // domains.jsonとcharacters.jsonを読み込み（API経由）
    const [data, charactersDataResponse, jsonData] = await Promise.all([
      ApiClient.getDomains(),
      ApiClient.getCharacters(),
      fetch('assets/data/domains.json').then(r => r.json()).catch(() => ({ domains: [] }))
    ]);
    
    // JSON ファイルからのドメインデータを ID でマップ化
    const jsonDomainsMap = {};
    if (jsonData && jsonData.domains) {
      jsonData.domains.forEach(domain => {
        jsonDomainsMap[domain.id] = domain;
      });
    }
    
    // デモモード時：初期モードを設定
    if (experienceMode === 'demo') {
      data.domains.forEach(domain => {
        domainModes[domain.id] = 'plain'; // デフォルトはPlain
      });
    }
    
    // キャラクターデータを設定
    if (charactersDataResponse && charactersDataResponse.characters) {
      charactersData = charactersDataResponse;
    }
    
    // 統計分析用にデータをキャッシュ（renderDomainHub前に設定）
    domainsDataForStats = data;
    
    // demoMetricsCacheに直接データを格納（JSON値を優先）
    data.domains.forEach(domain => {
      const jsonDomain = jsonDomainsMap[domain.id];
      
      if (domain.demoMetrics) {
        // JSON から直接 dailyVolume と averageTimePerCase を取得
        let dailyVolume = (jsonDomain?.demoMetrics?.dailyVolume) || 
                         (domain.demoMetrics?.dailyVolume) ||
                         (domain.demoMetrics?.dailyDocuments?.plain) ||
                         (domain.demoMetrics?.dailyDocuments?.smart) ||
                         (domain.demoMetrics?.dailyDocuments?.ai) || 0;
        
        let averageTimePerCase = (jsonDomain?.demoMetrics?.averageTimePerCase) || 
                                (domain.demoMetrics?.averageTimePerCase) || 60;
        
        demoMetricsCache[domain.id] = {
          ...domain.demoMetrics,
          dailyVolume: dailyVolume,
          averageTimePerCase: averageTimePerCase
        };
      } else if (domain.metrics) {
        // API から返されたデータ構造が異なる場合に対応
        let dailyVolume = (jsonDomain?.demoMetrics?.dailyVolume) ||
                         (domain.metrics?.dailyVolume) ||
                         (domain.metrics?.dailyDocuments?.plain) ||
                         (domain.metrics?.dailyDocuments?.smart) ||
                         (domain.metrics?.dailyDocuments?.ai) || 0;
        
        let averageTimePerCase = (jsonDomain?.demoMetrics?.averageTimePerCase) ||
                                (domain.metrics?.averageTimePerCase) || 60;
        
        demoMetricsCache[domain.id] = {
          ...domain.metrics,
          dailyVolume: dailyVolume,
          averageTimePerCase: averageTimePerCase
        };
      } else {
        // フォールバック：JSON から取得
        if (jsonDomain?.demoMetrics) {
          const dailyVolume = jsonDomain.demoMetrics.dailyVolume || 0;
          const averageTimePerCase = jsonDomain.demoMetrics.averageTimePerCase || 60;
          demoMetricsCache[domain.id] = {
            ...jsonDomain.demoMetrics,
            dailyVolume: dailyVolume,
            averageTimePerCase: averageTimePerCase
          };
        } else {
          demoMetricsCache[domain.id] = domain;
        }
      }
    });
    
    // デバッグ用：キャッシュの内容をコンソール出力
    console.log('demoMetricsCache loaded:', demoMetricsCache);
    
    displayCharacterInfo();
    renderDomainHub(data.domains);
    setupProfileLink();
    setupModeButtonListeners();
    
    // デモモード時：プラン選択UIを表示
    if (experienceMode === 'demo') {
      setupPlanSelection();
    }
    
    // 統計セクションの閉じるボタン
    const closeBtn = document.getElementById('closeStatistics');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeStatistics);
    }

    // 折り畳みセクションのイベントリスナーを設定
    setupCollapsibleSections();

    // クエリで統計を自動展開
    if (params.open === 'analysis') {
      showStatistics();
    }
  } catch (error) {
    console.error('Error loading domains:', error);
    document.getElementById('domainHub').innerHTML = `
      <div style="color: white; text-align: center; padding: 40px;">
        <h2>データの読み込みに失敗しました</h2>
        <p>domains.json が見つからないか、読み込めませんでした。</p>
      </div>
    `;
  }
});

/**
 * キャラクター情報を表示
 */
function displayCharacterInfo() {
  const profile = loadProfile();
  const bar = document.getElementById('characterInfoBar');
  if (!bar) return;

  if (!profile || !profile.character || !charactersData) {
    bar.style.display = 'none';
    return;
  }

  const character = charactersData.characters.find(c => c.id === profile.character);
  if (!character) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  bar.innerHTML = `
    <div class="character-info-icon">${character.emoji}</div>
    <div class="character-info-details">
      <div class="character-info-name">${character.name}として体験中</div>
      <div class="character-info-role">${character.role}</div>
    </div>
    <button onclick="navigate('intro.html')" class="change-character-btn">キャラクターを変更</button>
  `;
}

function renderDomainHub(domains) {
  const hub = document.getElementById('domainHub');
  hub.innerHTML = '';
  
  // デモモード時はツリー構造を使用
  if (experienceMode === 'demo') {
    renderTreeLayout(hub, domains);
  } else {
    // ゲームモード時は従来のリング/グリッド配置
    renderRingLayout(hub, domains);
  }
}

/**
 * ツリー構造レイアウト（デモモード用）
 */
function renderTreeLayout(hub, domains) {
  // 既存の要素をクリア（重複を防ぐ）
  hub.innerHTML = '';
  hub.classList.add('tree-view');
  
  // 行政DXを頂点に配置
  const admin = domains.find(d => d.id === 'administration');
  if (admin) {
    const rootNode = document.createElement('div');
    rootNode.className = 'domain-node tree-root';
    rootNode.setAttribute('data-domain-id', admin.id);
    
    rootNode.innerHTML = `
      <div class="domain-emoji">${admin.emoji}</div>
      <div class="domain-name">${admin.name}</div>
      ${createModeButtons(admin.id)}
    `;
    
    // モードボタンのイベント処理
    setupModeButtonListeners();
    
    hub.appendChild(rootNode);
  }
  
  // 依存分野を層状に配置
  const otherDomains = domains.filter(d => d.id !== 'administration');
  const branchesContainer = document.createElement('div');
  branchesContainer.className = 'tree-branches-container';
  
  otherDomains.forEach(domain => {
    const adminDependency = domain.demoMetrics?.administrativeDependency || 0;
    
    const branchNode = document.createElement('div');
    branchNode.className = 'domain-node tree-branch';
    branchNode.setAttribute('data-domain-id', domain.id);
    
    // 依存度に応じてクラスを設定
    let depClass = 'low-dependency';
    if (adminDependency >= 0.8) {
      depClass = 'high-dependency';
    } else if (adminDependency >= 0.4) {
      depClass = 'medium-dependency';
    }
    branchNode.classList.add(depClass);
    
    // コンテンツを構築（接続線も含めて一度に設定）
    const lineClass = adminDependency >= 0.8 ? 'high' : adminDependency >= 0.4 ? 'medium' : 'low';
    
    branchNode.innerHTML = `
      <div class="tree-branch-line ${lineClass}"></div>
      <div class="domain-emoji">${domain.emoji}</div>
      <div class="domain-name">${domain.name}</div>
      ${createModeButtons(domain.id)}
    `;
    
    branchesContainer.appendChild(branchNode);
  });
  
  hub.appendChild(branchesContainer);
  
  // デモモード時：初期統計を表示
  domains.forEach(domain => {
    updateDomainStats(domain.id, domainModes[domain.id] || 'plain');
  });
  
}

/**
 * リング/グリッド配置（ゲームモード用）
 */
function renderRingLayout(hub, domains) {
  // デスクトップ: リング配置の計算
  const isDesktop = window.innerWidth > 768;
  
  if (isDesktop) {
    // 中心からの距離（広くして重ならないように）
    const radius = 280;
    
    // 行政DXを最初に中央に配置
    const admin = domains.find(d => d.id === 'administration');
    if (admin) {
      const centerNode = document.createElement('a');
      centerNode.className = 'domain-node center';
      centerNode.href = '#';
      centerNode.setAttribute('role', 'button');
      centerNode.setAttribute('data-domain-id', admin.id);
      centerNode.setAttribute('aria-label', `${admin.name}の体験へ移動`);
      
      centerNode.style.left = 'calc(50% - 90px)';
      centerNode.style.top = 'calc(50% - 90px)';
      
      const adminCurrentMode = experienceMode === 'demo' ? (domainModes[admin.id] || 'plain') : 'plain';
      const adminModeLabel = adminCurrentMode === 'ai' ? '🤖 AI' : adminCurrentMode === 'smart' ? '💡 Smart' : '📋 Plain';
      const adminModeBadge = experienceMode === 'demo' ? `<div class="mode-badge" style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #333; z-index: 10;">${adminModeLabel}</div>` : '';
      
      centerNode.innerHTML = `
        ${adminModeBadge}
        <div class="domain-emoji">${admin.emoji}</div>
        <div class="domain-name">${admin.name}</div>
        ${experienceMode === 'demo' ? '<div class="analysis-badge">📊 クリックで統計分析</div>' : ''}
        <div class="domain-desc">${admin.description || ''}</div>
        ${experienceMode === 'demo' ? createModeButtons(admin.id) : ''}
      `;
      
      centerNode.addEventListener('click', (e) => {
        // mode-btnまたはmode-buttonsの場合は完全に無視
        if (e.target.closest('.mode-btn') || e.target.closest('.mode-buttons')) {
          return; // イベントを止めず、document levelのリスナーに委譲
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        if (experienceMode === 'demo') {
          // デモモード時：行政分野は分析ページへ
          navigateToAnalysis(admin.id);
        } else {
          // ゲームモード時：通常の分野詳細へ
          navigate('domain.html', { d: admin.id, mode: 'plain', experience: experienceMode });
        }
      });
      
      hub.appendChild(centerNode);
    }
    
    // その他の分野を円環配置
    const otherDomains = domains.filter(d => d.id !== 'administration');
    otherDomains.forEach((domain, index) => {
      const node = document.createElement('a');
      node.className = 'domain-node';
      node.href = '#';
      node.setAttribute('role', 'button');
      node.setAttribute('data-domain-id', domain.id);
      node.setAttribute('aria-label', `${domain.name}の体験へ移動`);
      
      // 12時の位置を起点に時計回りに配置
      const angle = (index / otherDomains.length) * 2 * Math.PI - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      // 右側のノード（x > 0）にクラスを追加してツールチップを右に表示
      if (x > 0) {
        node.classList.add('tooltip-right');
      }
      const railAngleDeg = (Math.atan2(-y, -x) * 180) / Math.PI;
      const railLength = Math.sqrt(x * x + y * y);
      
      node.style.left = `calc(50% + ${x}px - 70px)`;
      node.style.top = `calc(50% + ${y}px - 70px)`;
      node.style.setProperty('--rail-angle', `${railAngleDeg}deg`);
      node.style.setProperty('--rail-length', `${railLength}px`);
      
      const ringCurrentMode = experienceMode === 'demo' ? (domainModes[domain.id] || 'plain') : 'plain';
      const ringModeLabel = ringCurrentMode === 'ai' ? '🤖 AI' : ringCurrentMode === 'smart' ? '💡 Smart' : '📋 Plain';
      const ringModeBadge = experienceMode === 'demo' ? `<div class="mode-badge" style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #333; z-index: 10;">${ringModeLabel}</div>` : '';
      
      node.innerHTML = `
        ${ringModeBadge}
        <div class="domain-emoji">${domain.emoji}</div>
        <div class="domain-name">${domain.name}</div>
        <div class="domain-desc">${domain.description || ''}</div>
        ${experienceMode === 'demo' ? createModeButtons(domain.id) : ''}
      `;
      
      node.addEventListener('click', (e) => {
        // mode-btnまたはmode-buttonsの場合は完全に無視
        if (e.target.closest('.mode-btn') || e.target.closest('.mode-buttons')) {
          return; // イベントを止めず、document levelのリスナーに委譲
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        if (experienceMode === 'demo') {
          // デモモード時：モードボタン以外のクリックは無視
          return;
        } else {
          // ゲームモード時：通常の分野詳細へ
          navigate('domain.html', { d: domain.id, mode: 'plain', experience: experienceMode });
        }
      });
      
      hub.appendChild(node);
    });
  } else {
    // モバイル: グリッド配置
    // 行政DXを最初に配置
    const admin = domains.find(d => d.id === 'administration');
    if (admin) {
      const node = createDomainNode(admin, true);
      hub.appendChild(node);
    }
    
    // 他の分野
    domains.filter(d => d.id !== 'administration').forEach(domain => {
      const node = createDomainNode(domain, false);
      hub.appendChild(node);
    });
  }
  
  // デモモード時：初期統計を表示
  if (experienceMode === 'demo') {
    domains.forEach(domain => {
      updateDomainStats(domain.id, domainModes[domain.id] || 'plain');
    });
  }
}

function createDomainNode(domain, isCenter) {
  const node = document.createElement('a');
  node.className = `domain-node ${isCenter ? 'center' : ''}`;
  node.href = '#';
  node.setAttribute('role', 'button');
  node.setAttribute('data-domain-id', domain.id);
  node.setAttribute('aria-label', `${domain.name}の体験へ移動`);
  
  const mobileCurrentMode = experienceMode === 'demo' ? (domainModes[domain.id] || 'plain') : 'plain';
  const mobileModeLabel = mobileCurrentMode === 'ai' ? '🤖 AI' : mobileCurrentMode === 'smart' ? '💡 Smart' : '📋 Plain';
  const mobileModeBadge = experienceMode === 'demo' ? `<div class="mode-badge" style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #333; z-index: 10;">${mobileModeLabel}</div>` : '';
  
  node.innerHTML = `
    ${mobileModeBadge}
    <div class="domain-emoji">${domain.emoji}</div>
    <div class="domain-name">${domain.name}</div>
    ${experienceMode === 'demo' && domain.id === 'administration' ? '<div class="analysis-badge">📊 クリックで統計分析</div>' : ''}
    <div class="domain-desc">${domain.description || ''}</div>
    ${experienceMode === 'demo' ? createModeButtons(domain.id) : ''}
  `;
  
  node.addEventListener('click', (e) => {
    // mode-btnまたはmode-buttonsの場合は完全に無視
    if (e.target.closest('.mode-btn') || e.target.closest('.mode-buttons')) {
      return; // イベントを止めず、document levelのリスナーに委譲
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    if (experienceMode === 'demo') {
      // デモモード時
      if (domain.id === 'administration') {
        // 行政分野：分析ページへ
        navigateToAnalysis(domain.id);
      }
      // 他の分野：モードボタンのみ有効（クリックは無視）
    } else {
      // ゲームモード時：通常の分野詳細へ
      navigate('domain.html', { d: domain.id, mode: 'plain', experience: experienceMode });
    }
  });
  
  return node;
}

/**
 * デモモード用：モード選択ボタンのHTML生成
 */
function createModeButtons(domainId) {
  const currentMode = domainModes[domainId] || 'plain';
  // カスタムモードでない場合は非表示のスタイルを追加
  const displayStyle = isCustomMode ? '' : 'style="display: none;"';
  return `
    <div class="mode-buttons" ${displayStyle}>
      <button class="mode-btn ${currentMode === 'ai' ? 'active' : ''}" data-mode="ai" data-domain="${domainId}" type="button">
        🤖 AI
      </button>
      <button class="mode-btn ${currentMode === 'smart' ? 'active' : ''}" data-mode="smart" data-domain="${domainId}" type="button">
        💡 Smart
      </button>
      <button class="mode-btn ${currentMode === 'plain' ? 'active' : ''}" data-mode="plain" data-domain="${domainId}" type="button">
        📋 Plain
      </button>
    </div>
  `;
}

/**
 * デモモード用：行政分野クリック時に分析ページへ遷移
 */
function navigateToAnalysis(domainId) {
  // 統計セクションを表示してスクロール
  showStatistics();
}

/**
 * 統計セクションを表示
 */
function showStatistics() {
  const section = document.getElementById('statisticsSection');
  if (!section) return;
  
  // セクション表示
  section.style.display = 'block';
  
  // スムーズスクロール
  setTimeout(() => {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
  
  // 統計データを更新
  updateStatisticsAnalysis();
}

/**
 * 統計セクションを閉じる
 */
function closeStatistics() {
  const section = document.getElementById('statisticsSection');
  if (section) {
    section.style.display = 'none';
  }
}

// グラフ変数
let volumeChart = null;
let timeChart = null;
let roiChart = null;
let scalingEfficiencyChart = null;
let domainsDataForStats = null;
let demoMetricsCache = {};

/**
 * 統計分析を更新
 */
async function updateStatisticsAnalysis() {
  try {
    // データ未読み込みの場合は読み込み
    if (!domainsDataForStats) {
      domainsDataForStats = await ApiClient.getDomains();
      
      // demoMetricsをキャッシュ
      domainsDataForStats.domains.forEach(domain => {
        if (domain.demoMetrics) {
          demoMetricsCache[domain.id] = domain.demoMetrics;
        }
      });
    }
    
    // メトリクス計算
    const metrics = calculateMetrics();
    if (!metrics) {
      console.error('Failed to calculate metrics');
      return;
    }
    
    // UI更新
    updateMetricsDisplay(metrics);
    drawScalingEfficiencyChart(metrics);
    updateCharts(metrics);
    updateDomainDetails(metrics);
    updateAdminImpact(metrics);
    displayDomainDataSources();
    
  } catch (error) {
    console.error('Failed to update statistics:', error);
  }
}

/**
 * メトリクス計算
 */
function calculateMetrics() {
  if (!domainsDataForStats || !domainsDataForStats.domains) {
    console.error('domainsData is not loaded');
    return null;
  }
  
  // デバッグ：キャッシュの状態を確認
  console.log('calculateMetrics called');
  console.log('demoMetricsCache keys:', Object.keys(demoMetricsCache));
  console.log('domains count:', domainsDataForStats.domains.length);
  
  const costPerHour = domainsDataForStats?.meta?.demoMetaInfo?.costPerHour || 3000;
  
  let totalDailyVolume = 0;
  let totalProcessedAfter = 0;
  let totalTimeBefore = 0;
  let totalTimeAfter = 0;
  let totalCostBefore = 0;
  let totalCostAfter = 0;
  const domainMetrics = {};
  let totalAnnualMaintenanceCost = 0;
  let totalImplementationCost = 0;

  // 各分野のメトリクス計算
  domainsDataForStats.domains.forEach(domain => {
    let metrics = demoMetricsCache[domain.id];
    
    // dailyVolume がない場合は数値をチェックしてデバッグ
    if (!metrics) {
      console.warn(`No metrics found for domain: ${domain.id}`);
      return;
    }
    
    // dailyVolume が 0 または undefined の場合はログ出力
    if (!metrics.dailyVolume) {
      console.warn(`dailyVolume is missing for ${domain.id}:`, metrics);
    }
    
    console.log(`Processing domain: ${domain.id}, metrics:`, metrics);
    
    const domainMode = domainModes[domain.id] || 'plain';
    const dailyVolume = metrics.dailyVolume || 0;
    let reductionRate = metrics.reductionRates?.[domainMode] || 0;
    let timeReductionRate = metrics.timeReductionRates?.[domainMode] || 0;
    let costReductionRate = metrics.costReductionPercentage?.[domainMode] || 0;
    const adminDependency = metrics.administrativeDependency || 0;
    const implementationCost = metrics.implementationCost?.[domainMode] || 0;
    const annualMaintenanceCost = metrics.annualMaintenanceCost?.[domainMode] || 0;

    totalImplementationCost += implementationCost;
    totalAnnualMaintenanceCost += annualMaintenanceCost;

    // 行政DXの波及効果を適用（依存度ベース）
    const adminMode = domainModes['administration'] || 'plain';
    const baseReductionRate = reductionRate; // 基本削減率を保持
    const baseTimeReductionRate = timeReductionRate;
    const baseCostReductionRate = costReductionRate;
    
    let adminAdjustmentDetails = null;
    if (domain.id !== 'administration' && adminDependency > 0) {
      // 行政DXのモードに基づいて効率係数を決定
      let adminEfficiencyRate = 0; // Plain時は0%の効率
      if (adminMode === 'smart') {
        adminEfficiencyRate = 0.6; // Smart時は60%の効率
      } else if (adminMode === 'ai') {
        adminEfficiencyRate = 1.0; // AI時は100%の効率
      }
      
      // 依存度に基づいて現在の削減率を調整
      const dependencyFactor = adminDependency;
      const adminAdjustment = (1 - adminEfficiencyRate) * dependencyFactor;
      
      const adjustedRate = Math.max(0, reductionRate * (1 - adminAdjustment));
      const adjustedTimeRate = Math.max(0, timeReductionRate * (1 - adminAdjustment));
      const adjustedCostRate = Math.max(0, costReductionRate * (1 - adminAdjustment));
      
      adminAdjustmentDetails = {
        adminMode: adminMode,
        adminDependency: adminDependency,
        adminEfficiencyRate: adminEfficiencyRate,
        adminAdjustmentRate: adminAdjustment,
        beforeRate: baseReductionRate,
        afterRate: adjustedRate,
        reduction: (baseReductionRate - adjustedRate)
      };
      
      reductionRate = adjustedRate;
      timeReductionRate = adjustedTimeRate;
      costReductionRate = adjustedCostRate;
    }
    
    // 相互依存関係を適用：他分野の影響を計算
    const impactOnThisDomain = {};
    const interdependencyDetails = [];
    let cumulativeImpactPenalty = 0;
    
    domainsDataForStats.domains.forEach(otherDomain => {
      if (otherDomain.id === domain.id) return;
      
      const otherMode = domainModes[otherDomain.id] || 'plain';
      const otherMetrics = demoMetricsCache[otherDomain.id];
      
      // この分野は他の分野にどれだけ依存しているか
      const dependsOnOther = otherMetrics?.impactOnOtherDomains?.[domain.id] || 0;
      
      if (dependsOnOther > 0) {
        // 相手分野のDXレベルによる効率係数
        let otherEfficiency = 0;
        if (otherMode === 'smart') otherEfficiency = 0.6;
        if (otherMode === 'ai') otherEfficiency = 1.0;
        
        // 相手が低レベルだと、この分野の効果が削減される
        const otherImpactPenalty = (1 - otherEfficiency) * dependsOnOther;
        impactOnThisDomain[otherDomain.id] = otherImpactPenalty;
        cumulativeImpactPenalty += otherImpactPenalty;
        
        // 詳細情報を記録
        const otherDomainData = domainsDataForStats.domains.find(d => d.id === otherDomain.id);
        interdependencyDetails.push({
          domainId: otherDomain.id,
          domainName: otherDomainData?.name || '',
          domainEmoji: otherDomainData?.emoji || '',
          dependencyLevel: dependsOnOther,
          otherMode: otherMode,
          otherEfficiency: otherEfficiency,
          impactPenalty: otherImpactPenalty
        });
      }
    });
    
    // 相互依存による削減（複数分野から受ける影響を考慮）
    let interdependencyAdjustmentDetails = null;
    if (cumulativeImpactPenalty > 0) {
      const impactAdjustment = Math.min(0.8, cumulativeImpactPenalty); // 最大80%まで削減
      const adjustedRate = Math.max(0, reductionRate * (1 - impactAdjustment));
      const adjustedTimeRate = Math.max(0, timeReductionRate * (1 - impactAdjustment));
      const adjustedCostRate = Math.max(0, costReductionRate * (1 - impactAdjustment));
      
      interdependencyAdjustmentDetails = {
        cumulativeImpactPenalty: cumulativeImpactPenalty,
        actualAdjustment: impactAdjustment,
        beforeRate: reductionRate,
        afterRate: adjustedRate,
        reduction: (reductionRate - adjustedRate)
      };
      
      reductionRate = adjustedRate;
      timeReductionRate = adjustedTimeRate;
      costReductionRate = adjustedCostRate;
    }

    const processedBefore = dailyVolume;
    const processedAfter = Math.round(dailyVolume * (1 - reductionRate));
    const timeBefore = Math.round(metrics.averageTimePerCase * processedBefore / 60);
    const timeAfter = Math.round(metrics.averageTimePerCase * processedBefore * (1 - timeReductionRate) / 60);
    const costBefore = Math.round(timeBefore * costPerHour * 21 / 1000) * 1000;
    const costAfter = Math.round(timeAfter * costPerHour * 21 / 1000) * 1000;

    totalDailyVolume += dailyVolume;
    totalProcessedAfter += processedAfter;
    totalTimeBefore += timeBefore;
    totalTimeAfter += timeAfter;
    totalCostBefore += costBefore;
    totalCostAfter += costAfter;

    domainMetrics[domain.id] = {
      name: domain.name,
      emoji: domain.emoji,
      dailyVolume,
      reductionRate,
      baseReductionRate: baseReductionRate,
      processedBefore,
      processedAfter,
      timeBefore,
      timeAfter,
      costBefore,
      costAfter,
      timeReductionRate,
      costReductionRate,
      implementationCost,
      annualMaintenanceCost,
      administrativeDependency: adminDependency,
      interdependencies: impactOnThisDomain,
      impactOnOtherDomains: metrics.impactOnOtherDomains || {},
      // 詳細ロジック情報
      adminAdjustmentDetails: adminAdjustmentDetails,
      interdependencyDetails: interdependencyDetails,
      interdependencyAdjustmentDetails: interdependencyAdjustmentDetails
    };
  });

  const totalReductionRate = totalDailyVolume > 0 ? 1 - (totalProcessedAfter / totalDailyVolume) : 0;
  const totalTimeSaving = isNaN(totalTimeBefore - totalTimeAfter) ? 0 : totalTimeBefore - totalTimeAfter;
  const totalCostSaving = isNaN(totalCostBefore - totalCostAfter) ? 0 : totalCostBefore - totalCostAfter;

  // ROI分析用データを計算（5年間）
  const roiData = calculateROIData(totalCostSaving, totalImplementationCost, totalAnnualMaintenanceCost);

  const adminMode = domainModes['administration'] || 'plain';
  let adminImpactMessage = '';
  const adminDependentDomains = Object.entries(domainMetrics)
    .filter(([id, m]) => id !== 'administration' && m.administrativeDependency > 0.4)
    .map(([id, m]) => m.name);

  const domainList = adminDependentDomains.length > 0 
    ? adminDependentDomains.join('・') 
    : '全分野';

  if (adminMode === 'ai') {
    adminImpactMessage = `✅ 行政DXがAIレベルのため、${domainList}の効率が最大化されています`;
  } else if (adminMode === 'plain') {
    adminImpactMessage = `⚠️ 行政DXがPlainのため、${domainList}の効率が制限されています`;
  } else {
    adminImpactMessage = `🔄 行政DXがSmartレベルのため、${domainList}への影響は中程度です`;
  }

  return {
    totalReductionRate,
    totalProcessedAfter,
    totalDailyVolume,
    totalTimeSaving,
    totalCostSaving,
    totalImplementationCost,
    totalAnnualMaintenanceCost,
    domainMetrics,
    adminImpactMessage,
    roiData
  };
}

/**
 * メトリクス表示を更新
 */
function updateMetricsDisplay(metrics) {
  document.getElementById('reductionPercentage').textContent = 
    `${(metrics.totalReductionRate * 100).toFixed(1)}%`;
  document.getElementById('reductionDetail').textContent = 
    `${metrics.totalDailyVolume} → ${metrics.totalProcessedAfter} 件`;
  
  const daysPerYear = metrics.totalTimeSaving / 8;
  document.getElementById('timeSaving').textContent = 
    `${metrics.totalTimeSaving.toLocaleString()}時間`;
  document.getElementById('timeSavingDetail').textContent = 
    `年間 ${daysPerYear.toFixed(0)} 日分`;
  
  document.getElementById('costSaving').textContent = 
    `￥${metrics.totalCostSaving.toLocaleString()}`;
  document.getElementById('costSavingDetail').textContent = 
    `月額削減`;
  
  document.getElementById('adminImpact').textContent = 
    metrics.adminImpactMessage.split('のため')[0];
  document.getElementById('adminImpactDetail').textContent = 
    '全体への効果';
}

/**
 * ROI分析用のデータを計算（10年間）
 * 
 * 【削減効果の段階的な推移について】
 * DX/AI導入後の効果は、統計的に以下の理由で段階的に現れます：
 * 
 * 1. 学習曲線効果（Learning Curve）
 *    - 職員のシステム操作習熟に時間が必要
 *    - 新しいワークフローへの適応期間
 * 
 * 2. システム最適化期間
 *    - 初期の不具合修正・調整
 *    - データの蓄積によるAI精度の向上
 * 
 * 3. 組織変革管理（Change Management）
 *    - 既存プロセスからの移行抵抗
 *    - 段階的なロールアウト戦略
 * 
 * 4. 実測データに基づく推定
 *    - 多くの導入事例で、初年度は理論値の30～40%程度
 *    - 2年目で80～90%に達し、3年目以降に安定
 * 
 * 参考：McKinsey Digital Transformation Study, Gartner IT Implementation Research
 */
function calculateROIData(annualCostSaving, totalImplementationCost, totalAnnualMaintenanceCost) {
  const years = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const cumulativeCosts = []; // 累積コスト（実装+運用保守）
  const cumulativeSavings = []; // 累積削減効果
  const cumulativeNetBenefits = []; // 累計回収額（削減 - コスト）
  
  // 年別の削減効果率（段階的な効果モデル / S字カーブ）
  // 0年目: 実装期間（効果なし）
  // 1年目: 稼働開始・学習期間（35%の効果）
  // 2年目: 最適化期間（85%の効果）
  // 3年目以降: 安定稼働期間（100%の効果）
  const effectRateByYear = [0, 0.35, 0.85, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
  
  years.forEach((year, index) => {
    let cost = 0;
    let saving = 0;
    
    if (year === 0) {
      // 初年度：実装コスト（運用保守は2年目から）
      cost = totalImplementationCost;
      saving = 0; // 初年度は効果なし（実装中）
    } else {
      // 2年目以降：実装コスト + 毎年の運用保守費（year年分）
      cost = totalImplementationCost + (totalAnnualMaintenanceCost * year);
      
      // 削減効果を段階的に計上（学習曲線を考慮）
      let cumulativeSaving = 0;
      for (let i = 1; i <= year; i++) {
        cumulativeSaving += annualCostSaving * effectRateByYear[i];
      }
      saving = cumulativeSaving;
    }
    
    cumulativeCosts.push(cost);
    cumulativeSavings.push(saving);
    
    // 累計回収額 = 累積削減効果 - 累積コスト
    // ゼロを超えた年が投資回収年
    const netBenefit = saving - cost;
    cumulativeNetBenefits.push(netBenefit);
  });
  
  return {
    years,
    cumulativeCosts,
    cumulativeSavings,
    cumulativeNetBenefits,
    paybackYear: cumulativeNetBenefits.findIndex(net => net >= 0)
  };
}

/**
 * グラフを更新
 */
function updateCharts(metrics) {
  const labels = [];
  const timeData = [];
  
  Object.entries(metrics.domainMetrics).forEach(([id, m]) => {
    labels.push(m.emoji + ' ' + m.name);
    timeData.push((m.timeReductionRate * 100).toFixed(1));
  });
  
  // 時間削減グラフ
  const timeCtx = document.getElementById('timeChart');
  if (timeCtx) {
    if (timeChart) timeChart.destroy();
    timeChart = new Chart(timeCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '削減率 (%)',
          data: timeData,
          backgroundColor: 'rgba(249, 115, 22, 0.7)',
          borderColor: 'rgba(249, 115, 22, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: value => value + '%' }
          }
        }
      }
    });
  }
  
  // ROI分析グラフ
  if (metrics.roiData) {
    updateROIChart(metrics.roiData);
  }
}

/**
 * ROI分析グラフを更新
 */
function updateROIChart(roiData) {
  const roiCtx = document.getElementById('roiChart');
  if (!roiCtx) return;
  
  if (roiChart) roiChart.destroy();
  
  // Y軸用に金額をフォーマット
  const yearLabels = roiData.years.map(y => `${y}年目`);
  
  roiChart = new Chart(roiCtx, {
    type: 'line',
    data: {
      labels: yearLabels,
      datasets: [
        {
          label: '累積コスト（実装+運用保守）',
          data: roiData.cumulativeCosts,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 6,
          pointBackgroundColor: 'rgba(239, 68, 68, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: '累積削減効果',
          data: roiData.cumulativeSavings,
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: false,
          pointRadius: 6,
          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: '累計回収額（削減-コスト）',
          data: roiData.cumulativeNetBenefits,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: '金額（￥）'
          },
          ticks: {
            callback: function(value) {
              return '￥' + (value / 1000000).toFixed(0) + 'M';
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              const year = context.label;
              
              // 累計回収額がプラスに転じた年を強調
              if (label.includes('累計回収額') && value >= 0 && context.dataIndex > 0) {
                const prevValue = context.dataset.data[context.dataIndex - 1];
                if (prevValue < 0) {
                  return label + ': ￥' + value.toLocaleString() + ' 🎉 投資回収達成！';
                }
              }
              
              return label + ': ￥' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

/**
 * 分野別詳細を更新
 */
function updateDomainDetails(metrics) {
  const grid = document.getElementById('domainDetailsGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  Object.entries(metrics.domainMetrics).forEach(([id, m]) => {
    // 行政DXの依存度に基づいた警告/推奨を生成
    let adminDependencyNote = '';
    if (id !== 'administration' && m.administrativeDependency > 0) {
      const depPercent = (m.administrativeDependency * 100).toFixed(0);
      const adminMode = domainModes['administration'] || 'plain';
      
      if (adminMode === 'plain' && m.administrativeDependency >= 0.5) {
        adminDependencyNote = `⚠️ 行政DX依存度${depPercent}%：行政がPlainのため効果が限定的（SmartまたはAI推奨）`;
      } else if (adminMode === 'smart' && m.administrativeDependency >= 0.8) {
        adminDependencyNote = `📌 行政DX依存度${depPercent}%：行政がAIになるとさらに効果向上`;
      } else if (adminMode === 'ai' && m.administrativeDependency >= 0.8) {
        adminDependencyNote = `✅ 行政DX依存度${depPercent}%：行政DXがAIレベルで最大効果発揮`;
      } else if (m.administrativeDependency >= 0.4) {
        adminDependencyNote = `📌 行政DX依存度${depPercent}%：行政DXの影響あり`;
      }
    }
    
    // 相互依存情報を生成
    let interdependencyNote = '';
    if (Object.keys(m.interdependencies || {}).length > 0) {
      const criticalDeps = Object.entries(m.interdependencies)
        .filter(([_, impact]) => impact > 0.3)
        .map(([deptId, impact]) => {
          const depDomain = metrics.domainMetrics[deptId];
          return depDomain ? `${depDomain.emoji}${depDomain.name}（${(impact * 100).toFixed(0)}%減）` : '';
        })
        .filter(s => s);
      
      if (criticalDeps.length > 0) {
        interdependencyNote = `🔗 相互依存：${criticalDeps.join('、')}が低レベルだと効果が削減`;
      }
    }
    
    const currentMode = domainModes[id] || 'plain';
    const modeLabel = currentMode === 'ai' ? '🤖 AI' : currentMode === 'smart' ? '💡 Smart' : '📋 Plain';
    
    const card = document.createElement('div');
    card.className = 'domain-detail-card';
    
    // 詳細セクションの生成（最初は非表示）
    let detailsHTML = '';
    if (m.adminAdjustmentDetails || m.interdependencyDetails.length > 0) {
      detailsHTML = `
        <div class="detail-expandable" style="margin-top: 12px; border-top: 1px solid #eee; padding-top: 12px;">
          <button class="detail-toggle-btn" type="button" style="background: none; border: none; color: #0066cc; cursor: pointer; padding: 0; text-decoration: underline; font-size: 12px;">
            📊 計算ロジックと相互依存を表示
          </button>
          <div class="detail-content" style="display: none; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; color: #333;">
      `;
      
      // 削減率計算の内訳
      if (m.adminAdjustmentDetails) {
        const adminDetails = m.adminAdjustmentDetails;
        const adminModeLabel = adminDetails.adminMode === 'ai' ? '🤖 AI' : 
                                adminDetails.adminMode === 'smart' ? '💡 Smart' : '📋 Plain';
        detailsHTML += `
          <div style="margin-bottom: 8px;">
            <strong>🔧 行政DX依存度による調整：</strong><br>
            • 基本削減率: ${(adminDetails.beforeRate * 100).toFixed(1)}%<br>
            • 行政DXモード: ${adminModeLabel}<br>
            • 依存度: ${(adminDetails.adminDependency * 100).toFixed(0)}%<br>
            • 行政効率: ${(adminDetails.adminEfficiencyRate * 100).toFixed(0)}%<br>
            • 調整率: ${(adminDetails.adminAdjustmentRate * 100).toFixed(1)}%<br>
            <span style="color: #d32f2f;">→ 調整後: ${(adminDetails.afterRate * 100).toFixed(1)}% (${(adminDetails.reduction * 100).toFixed(1)}%低下)</span>
          </div>
        `;
      }
      
      // 相互依存関係の詳細
      if (m.interdependencyDetails.length > 0) {
        detailsHTML += `
          <div>
            <strong>🔗 相互依存関係の詳細：</strong><br>
        `;
        m.interdependencyDetails.forEach(dep => {
          const modeLabel = dep.otherMode === 'ai' ? '🤖 AI' : 
                           dep.otherMode === 'smart' ? '💡 Smart' : '📋 Plain';
          detailsHTML += `
            • ${dep.domainEmoji} ${dep.domainName}<br>
              依存度: ${(dep.dependencyLevel * 100).toFixed(0)}%、モード: ${modeLabel}、効率: ${(dep.otherEfficiency * 100).toFixed(0)}%<br>
              <span style="color: #f57c00;">→ 削減効果: ${(dep.impactPenalty * 100).toFixed(1)}%</span><br>
          `;
        });
        detailsHTML += `</div>`;
      }
      
      // 相互依存による最終調整
      if (m.interdependencyAdjustmentDetails) {
        const interpDetails = m.interdependencyAdjustmentDetails;
        detailsHTML += `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
            <strong>📉 相互依存による最終調整：</strong><br>
            • 累積ペナルティ: ${(interpDetails.cumulativeImpactPenalty * 100).toFixed(1)}%<br>
            • 実際の調整: ${Math.min(0.8, interpDetails.cumulativeImpactPenalty * 100).toFixed(1)}%<br>
            • 調整前: ${(interpDetails.beforeRate * 100).toFixed(1)}%<br>
            <span style="color: #d32f2f;">→ 最終削減率: ${(interpDetails.afterRate * 100).toFixed(1)}% (${(interpDetails.reduction * 100).toFixed(1)}%低下)</span>
          </div>
        `;
      }
      
      detailsHTML += `
          </div>
        </div>
      `;
    }
    
    card.innerHTML = `
      <div style="position: relative;">
        <div style="position: absolute; top: 0; right: 0; background: rgba(255,255,255,0.95); padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; color: #333; border: 1px solid #ddd;">${modeLabel}</div>
        <h4>${m.emoji} ${m.name}</h4>
      </div>
      <div class="detail-stat">
        <span class="detail-label">処理件数</span>
        <span class="detail-value">${m.processedBefore} → ${m.processedAfter}</span>
      </div>
      <div class="detail-stat">
        <span class="detail-label">削減率</span>
        <span class="detail-value">${(m.reductionRate * 100).toFixed(1)}%</span>
      </div>
      <div class="detail-stat">
        <span class="detail-label">時間削減</span>
        <span class="detail-value">${m.timeBefore}h → ${m.timeAfter}h</span>
      </div>
      <div class="detail-stat">
        <span class="detail-label">コスト削減</span>
        <span class="detail-value">￥${m.costBefore.toLocaleString()} → ￥${m.costAfter.toLocaleString()}</span>
      </div>
      ${m.implementationCost > 0 ? `<div class="detail-stat"><span class="detail-label">実装コスト</span><span class="detail-value">￥${m.implementationCost.toLocaleString()}</span></div>` : ''}
      ${m.annualMaintenanceCost > 0 ? `<div class="detail-stat"><span class="detail-label">年間運用保守費</span><span class="detail-value">￥${m.annualMaintenanceCost.toLocaleString()}</span></div>` : ''}
      ${id !== 'administration' ? `<div class="detail-stat"><span class="detail-label">行政DX依存度</span><span class="detail-value" style="color: ${m.administrativeDependency >= 0.8 ? '#d32f2f' : m.administrativeDependency >= 0.4 ? '#f57c00' : '#388e3c'}">${(m.administrativeDependency * 100).toFixed(0)}%</span></div>` : ''}
      ${adminDependencyNote ? `<div class="detail-note">${adminDependencyNote}</div>` : ''}
      ${interdependencyNote ? `<div class="detail-note">${interdependencyNote}</div>` : ''}
      ${detailsHTML}
    `;
    
    grid.appendChild(card);
    
    // 折り畳みボタンのイベントリスナー
    const toggleBtn = card.querySelector('.detail-toggle-btn');
    if (toggleBtn) {
      const detailContent = card.querySelector('.detail-content');
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (detailContent.style.display === 'none') {
          detailContent.style.display = 'block';
          toggleBtn.textContent = '📊 計算ロジックと相互依存を非表示';
        } else {
          detailContent.style.display = 'none';
          toggleBtn.textContent = '📊 計算ロジックと相互依存を表示';
        }
      });
    }
  });
}

/**
 * 行政DX波及効果を更新
 */
function updateAdminImpact(metrics) {
  const container = document.getElementById('impactDetails');
  if (!container) return;
  
  const ul = container.querySelector('ul');
  if (!ul) return;
  
  ul.innerHTML = `<li>${metrics.adminImpactMessage}</li>`;
  
  Object.entries(metrics.domainMetrics).forEach(([id, m]) => {
    if (id !== 'administration' && m.administrativeDependency > 0) {
      const depPercent = (m.administrativeDependency * 100).toFixed(0);
      ul.innerHTML += `<li>${m.emoji} ${m.name}: 行政依存度 ${depPercent}%</li>`;
    }
  });
}

/**
 * 分野別データソースを表示
 */
async function displayDomainDataSources() {
  try {
    const dataSourcesResponse = await fetch('assets/data/data-sources.json');
    const dataSources = await dataSourcesResponse.json();
    
    const container = document.getElementById('domainDataSources');
    if (!container) return;
    
    container.innerHTML = '';
    
    // domainsDataForStats から分野リストを取得
    if (domainsDataForStats && domainsDataForStats.domains) {
      domainsDataForStats.domains.forEach(domain => {
        const sources = dataSources.domains[domain.id];
        if (!sources) return;
        
        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'domain-source-card';
        sourceDiv.innerHTML = `
          <div class="source-header">
            <h5>${domain.emoji} ${domain.name}</h5>
          </div>
          <ul class="source-list">
            ${Object.entries(sources.sources)
              .map(([key, value]) => {
                const keyLabel = key === 'dailyVolume' ? '処理件数' :
                                key === 'reductionRates' ? '削減率' :
                                key === 'implementationCost' ? '実装コスト' :
                                key === 'timeReductionRate' ? '時間削減' : key;
                return `<li><strong>${keyLabel}：</strong> ${value}</li>`;
              })
              .join('')}
          </ul>
        `;
        container.appendChild(sourceDiv);
      });
    }
  } catch (error) {
    console.error('Failed to load data sources:', error);
  }
}

/**
 * プランカードのコスト情報を計算して更新
 */
function updatePlanCardCosts() {
  Object.keys(PLANS).forEach(planId => {
    // 該当プランでモードを設定
    const modes = PLANS[planId].modes;
    
    // 各分野のコストを合計
    let totalImplementationCost = 0;
    
    if (domainsDataForStats && domainsDataForStats.domains) {
      domainsDataForStats.domains.forEach(domain => {
        const mode = modes[domain.id] || 'plain';
        const metrics = demoMetricsCache[domain.id];
        if (metrics && metrics.implementationCost) {
          totalImplementationCost += metrics.implementationCost[mode] || 0;
        }
      });
    }
    
    // プランカードのコスト表示を更新
    const card = document.querySelector(`.plan-card[data-plan="${planId}"]`);
    if (card) {
      const featuresList = card.querySelector('.plan-features');
      if (featuresList) {
        // 最後のli要素を取得（コスト表示部分）
        const costItem = featuresList.querySelector('li:last-child');
        if (costItem && costItem.textContent.includes('コスト')) {
          // コストを更新
          const costInMillions = Math.round(totalImplementationCost / 10000000) / 10; // 百万円単位
          costItem.textContent = `コスト: 約￥${costInMillions}億` + (costInMillions < 1 ? ` (${Math.round(totalImplementationCost / 1000000)}百万)` : '');
        }
      }
    }
  });
}

/**
 * プラン選択UIのセットアップ
 */
function setupPlanSelection() {
  const planSection = document.getElementById('planSelection');
  if (!planSection) {
    console.warn('planSelection element not found');
    return;
  }
  planSection.style.display = 'block';
  
  // プランカードのコスト情報を更新
  updatePlanCardCosts();
  
  // プランカードのクリックイベント
  const planCards = document.querySelectorAll('.plan-card');
  planCards.forEach(card => {
    card.addEventListener('click', () => {
      const planId = card.dataset.plan;
      selectPlan(planId);
      
      // 選択状態の更新
      planCards.forEach(c => c.classList.remove('plan-card-selected'));
      card.classList.add('plan-card-selected');
    });
  });
  
  // カスタムプランの折りたたみ
  const toggleBtn = document.getElementById('toggleCustomPlan');
  const customContent = document.getElementById('customPlanContent');
  if (!toggleBtn || !customContent) {
    console.warn('toggleCustomPlan or customPlanContent element not found');
  } else {
    toggleBtn.addEventListener('click', () => {
      const isVisible = customContent.style.display !== 'none';
      customContent.style.display = isVisible ? 'none' : 'block';
      const toggleIcon = toggleBtn.querySelector('.toggle-icon');
      if (toggleIcon) {
        toggleIcon.textContent = isVisible ? '▶' : '▼';
      }
      
      // カスタムプラン展開時はカスタムモードを有効化
      if (!isVisible) {
        isCustomMode = true;
        // プラン選択をクリア
        document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('plan-card-selected'));
        // ツリービューのボタンを表示
        const hub = document.getElementById('domainHub');
        if (hub && domainsDataForStats) {
          renderTreeLayout(hub, domainsDataForStats.domains);
        }
      }
    });
  }
  
  // デフォルトで推奨プランを選択
  selectPlan('recommended');
  const recommendedCard = document.querySelector('.plan-card[data-plan="recommended"]');
  if (recommendedCard) {
    recommendedCard.classList.add('plan-card-selected');
  }
}

/**
 * プランを選択してモードを設定
 */
function selectPlan(planId) {
  const plan = PLANS[planId];
  if (!plan) return;
  
  // カスタムモードを無効化
  isCustomMode = false;
  
  // 各分野のモードを設定
  domainModes = { ...plan.modes };
  
  // ツリービューを更新
  const hub = document.getElementById('domainHub');
  if (domainsDataForStats && hub) {
    renderTreeLayout(hub, domainsDataForStats.domains);
  }
}

/**
 * モードボタンのリスナーをセットアップ
 */
function setupModeButtonListeners() {
  if (experienceMode !== 'demo') return;
  
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    
    // イベントの伝播とデフォルト動作を防ぐ
    e.preventDefault();
    e.stopPropagation();
    
    const mode = btn.dataset.mode;
    const domainId = btn.dataset.domain;
    
    if (!mode || !domainId) return;
    
    console.log(`Mode changed for ${domainId}: ${mode}`);
    
    // 状態更新
    domainModes[domainId] = mode;
    
    // 同じ分野の他のボタンからactiveを削除
    const parent = btn.closest('.mode-buttons');
    if (parent) {
      parent.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    
    // リアルタイムで統計を更新
    updateDomainStats(domainId, mode);
  });
}

/**
 * ドメインの統計をリアルタイム更新
 */
async function updateDomainStats(domainId, mode) {
  try {
    // domains.json からデータを取得
      const domain = domainsDataForStats.domains.find(d => d.id === domainId);
    
    if (!domain || !domain.demoMetrics) {
      console.warn(`No demoMetrics found for ${domainId}`);
      return;
    }
    
    const metrics = domain.demoMetrics;
    const reductionRate = Number(metrics.reductionRates?.[mode] ?? 0);
    const timeReduction = Number(metrics.timeReductionRates?.[mode] ?? 0);
    const costReduction = Number(metrics.costReductionPercentage?.[mode] ?? 0);
    const implementationCost = Number(metrics.implementationCost?.[mode] ?? 0);
    
    // 統計表示エリアを更新
    const statsDiv = document.getElementById(`stats-${domainId}`);
    if (statsDiv) {
      const redVal = isNaN(reductionRate) ? 0 : reductionRate;
      const timVal = isNaN(timeReduction) ? 0 : timeReduction;
      const costVal = isNaN(costReduction) ? 0 : costReduction;
      const implCost = isNaN(implementationCost) ? 0 : implementationCost;
      
      // 実装コスト表示用にフォーマット
      let costDisplay = '';
      if (implCost > 0) {
        if (implCost >= 100000000) {
          costDisplay = `\u00a5${(implCost / 100000000).toFixed(1)}億`;
        } else if (implCost >= 10000000) {
          costDisplay = `\u00a5${(implCost / 10000000).toFixed(0)}千万`;
        } else if (implCost >= 1000000) {
          costDisplay = `\u00a5${(implCost / 1000000).toFixed(0)}百万`;
        }
      }
      
      statsDiv.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">書類削減率:</span> 
          <span class="stat-value">${(redVal * 100).toFixed(1)}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">時間短縮:</span> 
          <span class="stat-value">${(timVal * 100).toFixed(1)}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">コスト削減:</span> 
          <span class="stat-value">${(costVal * 100).toFixed(1)}%</span>
        </div>
        ${implCost > 0 ? `<div class="stat-item"><span class="stat-label">実装コスト:</span> <span class="stat-value">${costDisplay}</span></div>` : ''}
      `;
      
      // フラッシュアニメーション
      statsDiv.classList.add('stats-flash');
      setTimeout(() => statsDiv.classList.remove('stats-flash'), 500);
      
      // 吹き出しを3秒間強制表示
      statsDiv.classList.add('force-show');
      setTimeout(() => statsDiv.classList.remove('force-show'), 3000);
    }
    
    // 統計セクションが表示されている場合は更新
    const statisticsSection = document.getElementById('statisticsSection');
    if (statisticsSection && statisticsSection.style.display === 'block') {
      updateStatisticsAnalysis();
    }
    
    // 行政分野の場合、全分野にリップル効果を表示
    if (domainId === 'administration') {
      showAdminImpactRipple();
    }
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}

/**
 * 行政モード変更時に他分野へのリップル効果を表示
 */
function showAdminImpactRipple() {
  // 行政以外の全分野のノードにリップルエフェクトを適用
  const allNodes = document.querySelectorAll('.domain-node[data-domain-id]:not([data-domain-id="administration"])');
  
  allNodes.forEach((node, index) => {
    // 順次リップルを表示（遅延付き）
    setTimeout(() => {
      node.classList.add('admin-impact');
      setTimeout(() => {
        node.classList.remove('admin-impact');
      }, 1500);
    }, index * 200);
  });
}

function setupProfileLink() {
  const link = document.getElementById('changeProfileLink');
  if (!link) {
    console.warn('changeProfileLink element not found');
    return;
  }
  link.addEventListener('click', (e) => {
    e.preventDefault();
    // プロファイルをクリアして intro に戻る
    clearProfile();
    window.location.href = 'intro.html';
  });
}

/**
 * スケーリング効率グラフを描画
 * 異なる人口規模でのROI倍率を可視化
 */
function drawScalingEfficiencyChart(metrics) {
  const canvas = document.getElementById('scalingEfficiencyChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // 複数規模でのROI計算
  const populations = [300000, 500000, 1000000, 1500000, 2000000];
  const roiData = [];

  populations.forEach(pop => {
    // スケール係数（現在は100万人ベース）
    const scaleFactor = pop / 1000000;
    
    // スケール後のメトリクス計算
    const scaledCostSaving = metrics.totalCostSaving * scaleFactor;
    const costSavingInBillions = scaledCostSaving / 100000000; // 億円単位
    const roi = metrics.totalImplementationCost > 0 
      ? scaledCostSaving / metrics.totalImplementationCost 
      : 0;
    
    roiData.push({
      population: pop,
      costSaving: costSavingInBillions,
      roi: roi,
      label: `${(pop / 10000).toFixed(0)}万人`
    });
  });

  // 既存グラフがあれば破棄
  if (scalingEfficiencyChart) {
    scalingEfficiencyChart.destroy();
  }

  // グラフ作成
  scalingEfficiencyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: roiData.map(d => d.label),
      datasets: [{
        label: '年間削減効果（億円）',
        data: roiData.map(d => d.costSaving.toFixed(1)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        hoverBackgroundColor: '#059669'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { size: 14, weight: 'bold' },
            color: '#374151',
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            label: function(context) {
              const costSaving = parseFloat(context.parsed.y);
              return `年間削減効果: ¥${costSaving.toFixed(1)}億円`;
            },
            afterLabel: function(context) {
              const idx = context.dataIndex;
              const roi = roiData[idx].roi;
              const implCost = metrics.totalImplementationCost / 100000000; // 億円
              return [
                `実装コスト: ¥${implCost.toFixed(1)}億円`,
                `ROI倍率: ${roi.toFixed(2)}倍`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 12,
          title: {
            display: true,
            text: '年間削減効果（億円）',
            font: { size: 14, weight: 'bold' }
          },
          ticks: {
            color: '#6b7280',
            font: { size: 12 },
            callback: function(value) {
              return '¥' + value.toFixed(1) + '億';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false
          }
        },
        x: {
          title: {
            display: true,
            text: '対象規模（人口）',
            font: { size: 14, weight: 'bold' }
          },
          ticks: {
            color: '#6b7280',
            font: { size: 12 }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });

  // スケーリングセクションを表示
  const scalingSection = document.getElementById('scalingEfficiencySection');
  if (scalingSection) {
    scalingSection.style.display = 'block';
  }
}

/**
 * 折り畳み可能セクションのイベントリスナー設定
 */
function setupCollapsibleSections() {
  const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
  
  collapsibleHeaders.forEach(header => {
    header.addEventListener('click', function(e) {
      // toggle-btn 自身のクリックも処理する
      e.preventDefault();
      
      const section = this.closest('.collapsible-section');
      const content = section.querySelector('.collapsible-content');
      const isExpanded = section.classList.contains('expanded');
      
      if (isExpanded) {
        // 折りたたむ
        section.classList.remove('expanded');
        content.style.display = 'none';
      } else {
        // 展開する
        section.classList.add('expanded');
        content.style.display = 'block';
      }
    });
  });
}
