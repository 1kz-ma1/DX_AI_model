// home.js - 分野選択画面のレンダリング（リング/グリッド）

let charactersData = null;
let experienceMode = 'game'; // URLパラメータから取得
let domainModes = {}; // デモモード時の各分野のモード状態

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
    
    // domains.jsonとcharacters.jsonを読み込み
    const [domainsResponse, charactersResponse] = await Promise.all([
      fetch('assets/data/domains.json'),
      fetch('assets/data/characters.json')
    ]);
    
    if (!domainsResponse.ok) throw new Error('Failed to load domains.json');
    const data = await domainsResponse.json();
    
    // デモモード時：初期モードを設定
    if (experienceMode === 'demo') {
      data.domains.forEach(domain => {
        domainModes[domain.id] = 'plain'; // デフォルトはPlain
      });
    }
    
    if (charactersResponse.ok) {
      charactersData = await charactersResponse.json();
    }
    
    displayCharacterInfo();
    renderDomainHub(data.domains);
    setupProfileLink();
    setupModeButtonListeners();
    
    // 統計セクションの閉じるボタン
    const closeBtn = document.getElementById('closeStatistics');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeStatistics);
    }

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
      
      centerNode.innerHTML = `
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
      
      node.innerHTML = `
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
  
  node.innerHTML = `
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
  return `
    <div class="mode-buttons">
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
    <div class="domain-stats" id="stats-${domainId}">
      <div class="stat-item">削減率: <span class="stat-value">0%</span></div>
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
let domainsDataForStats = null;
let demoMetricsCache = {};

/**
 * 統計分析を更新
 */
async function updateStatisticsAnalysis() {
  try {
    // データ未読み込みの場合は読み込み
    if (!domainsDataForStats) {
      const response = await fetch('assets/data/domains.json');
      if (!response.ok) throw new Error('Failed to load domains.json');
      domainsDataForStats = await response.json();
      
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
    updateCharts(metrics);
    updateDomainDetails(metrics);
    updateAdminImpact(metrics);
    
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
  
  const costPerHour = domainsDataForStats?.meta?.demoMetaInfo?.costPerHour || 3000;
  
  let totalDailyVolume = 0;
  let totalProcessedAfter = 0;
  let totalTimeBefore = 0;
  let totalTimeAfter = 0;
  let totalCostBefore = 0;
  let totalCostAfter = 0;
  const domainMetrics = {};

  // 各分野のメトリクス計算
  domainsDataForStats.domains.forEach(domain => {
    const metrics = demoMetricsCache[domain.id];
    if (!metrics) {
      console.warn(`No demoMetrics found for domain: ${domain.id}`);
      return;
    }
    
    const domainMode = domainModes[domain.id] || 'plain';
    const dailyVolume = metrics.dailyVolume || 0;
    let reductionRate = metrics.reductionRates?.[domainMode] || 0;
    let timeReductionRate = metrics.timeReductionRates?.[domainMode] || 0;
    let costReductionRate = metrics.costReductionPercentage?.[domainMode] || 0;
    const adminDependency = metrics.administrativeDependency || 0;

    // 行政DXの波及効果を適用
    const adminMode = domainModes['administration'] || 'plain';
    if (domain.id !== 'administration' && adminMode !== 'ai') {
      const adminDegradation = adminDependency * 0.3;
      reductionRate = Math.max(0, reductionRate - (reductionRate * adminDegradation));
      timeReductionRate = Math.max(0, timeReductionRate - (timeReductionRate * adminDegradation));
      costReductionRate = Math.max(0, costReductionRate - (costReductionRate * adminDegradation));
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
      processedBefore,
      processedAfter,
      timeBefore,
      timeAfter,
      costBefore,
      costAfter,
      timeReductionRate,
      costReductionRate,
      administrativeDependency: adminDependency,
      impactOnOtherDomains: metrics.impactOnOtherDomains || {}
    };
  });

  const totalReductionRate = 1 - (totalProcessedAfter / totalDailyVolume);
  const totalTimeSaving = totalTimeBefore - totalTimeAfter;
  const totalCostSaving = totalCostBefore - totalCostAfter;

  const adminMode = domainModes['administration'] || 'plain';
  let adminImpactMessage = '';
  const adminDependentDomains = Object.entries(domainMetrics)
    .filter(([id, m]) => id !== 'administration' && m.administrativeDependency > 0.5)
    .map(([id, m]) => m.name);

  if (adminMode === 'ai') {
    adminImpactMessage = `✅ 行政DXがAIレベルのため、${adminDependentDomains.join('・')}の効率が最大化されています`;
  } else if (adminMode === 'plain') {
    adminImpactMessage = `⚠️ 行政DXがPlainのため、${adminDependentDomains.join('・')}の効率が制限されています`;
  } else {
    adminImpactMessage = `🔄 行政DXがSmartレベルのため、${adminDependentDomains.join('・')}への影響は中程度です`;
  }

  return {
    totalReductionRate,
    totalProcessedAfter,
    totalDailyVolume,
    totalTimeSaving,
    totalCostSaving,
    domainMetrics,
    adminImpactMessage
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
 * グラフを更新
 */
function updateCharts(metrics) {
  const labels = [];
  const volumeData = [];
  const timeData = [];
  
  Object.entries(metrics.domainMetrics).forEach(([id, m]) => {
    labels.push(m.emoji + ' ' + m.name);
    volumeData.push((m.reductionRate * 100).toFixed(1));
    timeData.push((m.timeReductionRate * 100).toFixed(1));
  });
  
  // 流通件数削減グラフ
  const volumeCtx = document.getElementById('volumeChart');
  if (volumeCtx) {
    if (volumeChart) volumeChart.destroy();
    volumeChart = new Chart(volumeCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '削減率 (%)',
          data: volumeData,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgba(59, 130, 246, 1)',
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
}

/**
 * 分野別詳細を更新
 */
function updateDomainDetails(metrics) {
  const grid = document.getElementById('domainDetailsGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  Object.entries(metrics.domainMetrics).forEach(([id, m]) => {
    const card = document.createElement('div');
    card.className = 'domain-detail-card';
    card.innerHTML = `
      <h4>${m.emoji} ${m.name}</h4>
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
    `;
    grid.appendChild(card);
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
    const response = await fetch('assets/data/domains.json');
    const data = await response.json();
    const domain = data.domains.find(d => d.id === domainId);
    
    if (!domain || !domain.demoMetrics) {
      console.warn(`No demoMetrics found for ${domainId}`);
      return;
    }
    
    const metrics = domain.demoMetrics;
    const reductionRate = Number(metrics.reductionRates?.[mode] ?? 0);
    const timeReduction = Number(metrics.timeReductionRates?.[mode] ?? 0);
    const costReduction = Number(metrics.costReductionPercentage?.[mode] ?? 0);
    
    // 統計表示エリアを更新
    const statsDiv = document.getElementById(`stats-${domainId}`);
    if (statsDiv) {
      const redVal = isNaN(reductionRate) ? 0 : reductionRate;
      const timVal = isNaN(timeReduction) ? 0 : timeReduction;
      const costVal = isNaN(costReduction) ? 0 : costReduction;
      
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
  link.addEventListener('click', (e) => {
    e.preventDefault();
    // プロファイルをクリアして intro に戻る
    clearProfile();
    window.location.href = 'intro.html';
  });
}
