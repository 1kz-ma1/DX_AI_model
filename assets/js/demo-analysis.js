/**
 * demo-analysis.js - デモモード分析ページのロジック
 * 社会全体のDX×AI導入による影響を動的に計算・表示
 */

console.log('demo-analysis.js loaded');

let currentMode = 'smart';
let domainsData = null;
let demoMetricsCache = {};
let volumeChart = null;
let timeChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('DOMContentLoaded event fired');
    
    // URLパラメータから初期モードを取得
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode')) {
      currentMode = params.get('mode');
      console.log(`Mode from URL: ${currentMode}`);
    }

    // domains.jsonを読み込み（どこから実行されてもdocsパスを正しく解決）
    let dataUrl = 'assets/data/domains.json';
    console.log(`Attempting to fetch: ${dataUrl}`);
    
    let response = await fetch(dataUrl);
    if (!response.ok && window.location.pathname.includes('/pages/')) {
      // pages/ フォルダからアクセスされている場合は ../ を付ける
      dataUrl = '../assets/data/domains.json';
      console.log(`First attempt failed. Attempting: ${dataUrl}`);
      response = await fetch(dataUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch domains.json: ${response.status}`);
    }
    domainsData = await response.json();
    console.log(`Loaded domains.json, found ${domainsData.domains.length} domains`);

    // demoMetricsをキャッシュ
    domainsData.domains.forEach(domain => {
      if (domain.demoMetrics) {
        demoMetricsCache[domain.id] = domain.demoMetrics;
      }
    });
    console.log(`Cached ${Object.keys(demoMetricsCache).length} demoMetrics`);

    // UI初期化
    console.log('Initializing UI');
    initUI();

    // 初期描画
    console.log('Updating analysis');
    updateAnalysis();
  } catch (error) {
    console.error('Failed to load data:', error);
    alert('データの読み込みに失敗しました: ' + error.message);
  }
});

/**
 * UI初期化
 */
function initUI() {
  // 戻るボタン
  const backToDomain = document.getElementById('backToDomain');
  const backToDomainBtn = document.getElementById('backToDomainBtn');
  const backToHubBtn = document.getElementById('backToHubBtn');

  if (backToDomain) {
    backToDomain.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('domain.html', { experience: 'demo' });
    });
  }

  if (backToDomainBtn) {
    backToDomainBtn.addEventListener('click', () => {
      navigate('domain.html', { experience: 'demo' });
    });
  }

  if (backToHubBtn) {
    backToHubBtn.addEventListener('click', () => {
      navigate('home.html', { experience: 'demo' });
    });
  }

  // モード切り替えボタン
  const modeBtns = document.querySelectorAll('.mode-btn');
  console.log(`Found ${modeBtns.length} mode buttons`);
  
  modeBtns.forEach(btn => {
    if (btn.dataset.mode === currentMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      const newMode = btn.dataset.mode;
      console.log(`Mode button clicked: ${newMode}, current: ${currentMode}`);
      if (newMode !== currentMode) {
        currentMode = newMode;
        
        // ボタンの状態更新
        document.querySelectorAll('.mode-btn').forEach(b => {
          b.classList.remove('active');
        });
        btn.classList.add('active');

        // 分析更新
        console.log(`Mode changed to: ${currentMode}`);
        updateAnalysis();
      }
    });
  });
}

/**
 * 分析更新（モード変更時）
 */
function updateAnalysis() {
  // メトリクス計算
  const metrics = calculateMetrics();

  // UI更新
  updateMetricsDisplay(metrics);

  // グラフ更新
  updateCharts(metrics);

  // 分野別詳細更新
  updateDomainDetails(metrics);

  // 行政DXの波及効果表示
  updateAdminImpact(metrics);
}

/**
 * メトリクス計算
 * 行政DXの波及効果を正確に反映
 */
function calculateMetrics() {
  const costPerHour = domainsData.meta.demoMetaInfo?.costPerHour || 3000;
  
  let totalDailyVolume = 0;
  let totalProcessedAfter = 0;
  let totalTimeBefore = 0;
  let totalTimeAfter = 0;
  let totalCostBefore = 0;
  let totalCostAfter = 0;
  const domainMetrics = {};

  // 各分野のメトリクス計算
  domainsData.domains.forEach(domain => {
    const metrics = demoMetricsCache[domain.id];
    if (!metrics) return;

    const dailyVolume = metrics.dailyVolume;
    let reductionRate = metrics.reductionRates[currentMode] || 0;
    let timeReductionRate = metrics.timeReductionRates[currentMode] || 0;
    let costReductionRate = metrics.costReductionPercentage[currentMode] || 0;
    const adminDependency = metrics.administrativeDependency || 0;

    // 行政DXの波及効果を適用
    // 行政がPlainの場合、行政に依存している分野は効率が低下
    if (domain.id !== 'administration' && currentMode !== 'ai') {
      const adminDegradation = adminDependency * 0.3; // 最大30%の効率低下
      reductionRate = Math.max(0, reductionRate - (reductionRate * adminDegradation));
      timeReductionRate = Math.max(0, timeReductionRate - (timeReductionRate * adminDegradation));
      costReductionRate = Math.max(0, costReductionRate - (costReductionRate * adminDegradation));
    }

    const processedBefore = dailyVolume;
    const processedAfter = Math.round(dailyVolume * (1 - reductionRate));
    const timeBefore = Math.round(metrics.averageTimePerCase * processedBefore / 60);
    const timeAfter = Math.round(metrics.averageTimePerCase * processedBefore * (1 - timeReductionRate) / 60);
    const costBefore = Math.round(timeBefore * costPerHour * 21 / 1000) * 1000; // 月額ベース
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
      administrativeDependency,
      impactOnOtherDomains: metrics.impactOnOtherDomains || {}
    };
  });

  // 全体の削減率計算
  const totalReductionRate = 1 - (totalProcessedAfter / totalDailyVolume);
  const totalTimeSaving = totalTimeBefore - totalTimeAfter;
  const totalCostSaving = totalCostBefore - totalCostAfter;

  // 行政DXの波及効果メッセージ
  let adminImpactMessage = '';
  const adminDependentDomains = Object.entries(domainMetrics)
    .filter(([id, m]) => id !== 'administration' && m.administrativeDependency > 0.5)
    .map(([id, m]) => m.name);

  if (currentMode === 'ai') {
    adminImpactMessage = `✅ 行政DXがAIレベルのため、${adminDependentDomains.join('・')}の効率が最大化されています`;
  } else if (currentMode === 'plain') {
    adminImpactMessage = `⚠️ 行政DXがPlainのため、${adminDependentDomains.join('・')}の効率が制限されています`;
  } else {
    adminImpactMessage = `→ 行政DXが中程度のため、各分野の効率向上に部分的な制約があります`;
  }

  return {
    currentMode,
    totalDailyVolume,
    totalReductionRate,
    totalTimeBefore,
    totalTimeAfter,
    totalTimeSaving,
    totalCostBefore,
    totalCostAfter,
    totalCostSaving,
    domainMetrics,
    adminImpactMessage,
    costPerHour
  };
}

/**
 * メトリクス表示更新
 */
function updateMetricsDisplay(metrics) {
  // 流通件数削減率
  const reductionPercent = Math.round(metrics.totalReductionRate * 100);
  document.getElementById('reductionPercentage').textContent = `${reductionPercent}%`;
  document.getElementById('reductionDetail').textContent = 
    `${metrics.totalDailyVolume.toLocaleString()}件 → ${(metrics.totalDailyVolume - Math.round(metrics.totalDailyVolume * metrics.totalReductionRate)).toLocaleString()}件`;

  // 時間削減（年間）
  const yearlyTimeSaving = Math.round(metrics.totalTimeSaving * 250 / 8); // 営業日ベース
  document.getElementById('timeSaving').textContent = `${yearlyTimeSaving}日分`;
  document.getElementById('timeSavingDetail').textContent = 
    `削減: ${metrics.totalTimeBefore.toLocaleString()}h → ${metrics.totalTimeAfter.toLocaleString()}h`;

  // コスト削減（月額）
  const monthlyCostBefore = Math.round(metrics.totalCostBefore / 21); // 営業日で月換算
  const monthlyCostAfter = Math.round(metrics.totalCostAfter / 21);
  const monthlySaving = monthlyCostBefore - monthlyCostAfter;
  document.getElementById('costSaving').textContent = 
    `￥${monthlySaving.toLocaleString()}`;
  document.getElementById('costSavingDetail').textContent = 
    `月額削減 (￥${monthlyCostBefore.toLocaleString()} → ￥${monthlyCostAfter.toLocaleString()})`;

  // 行政DXの波及効果
  document.getElementById('adminImpact').textContent = metrics.adminImpactMessage;
}

/**
 * グラフ更新
 */
function updateCharts(metrics) {
  const domainIds = Object.keys(metrics.domainMetrics);
  const domainNames = domainIds.map(id => metrics.domainMetrics[id].name);
  const domainEmojis = domainIds.map(id => metrics.domainMetrics[id].emoji);

  // 処理件数削減率グラフ
  const volumeReductionData = domainIds.map(id => {
    const m = metrics.domainMetrics[id];
    return Math.round(m.reductionRate * 100);
  });

  updateVolumeChart(domainNames, domainEmojis, volumeReductionData);

  // 時間削減率グラフ
  const timeReductionData = domainIds.map(id => {
    const m = metrics.domainMetrics[id];
    return Math.round(m.timeReductionRate * 100);
  });

  updateTimeChart(domainNames, domainEmojis, timeReductionData);
}

/**
 * 処理件数削減率グラフ更新
 */
function updateVolumeChart(labels, emojis, reductionPercentages) {
  const ctx = document.getElementById('volumeChart')?.getContext('2d');
  if (!ctx) return;

  const chartLabels = labels.map((label, i) => `${emojis[i]} ${label}`);

  if (volumeChart) {
    volumeChart.destroy();
  }

  volumeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: '流通件数削減率',
          data: reductionPercentages,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(37, 99, 235)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        title: {
          display: true,
          text: '各分野における流通件数削減率（%）'
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: '削減率（%）'
          }
        }
      }
    }
  });
}

/**
 * 時間削減率グラフ更新
 */
function updateTimeChart(labels, emojis, timeReductionPercentages) {
  const ctx = document.getElementById('timeChart')?.getContext('2d');
  if (!ctx) return;

  const chartLabels = labels.map((label, i) => `${emojis[i]} ${label}`);

  if (timeChart) {
    timeChart.destroy();
  }

  timeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: '必要時間削減率',
          data: timeReductionPercentages,
          backgroundColor: 'rgba(249, 115, 22, 0.8)',
          borderColor: 'rgb(217, 119, 6)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        title: {
          display: true,
          text: '各分野における必要時間削減率（%）'
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: '削減率（%）'
          }
        }
      }
    }
  });
}

/**
 * 分野別詳細更新
 */
function updateDomainDetails(metrics) {
  const grid = document.getElementById('domainDetailsGrid');
  if (!grid) return;

  grid.innerHTML = Object.entries(metrics.domainMetrics).map(([id, metric]) => {
    const reductionPercent = Math.round(metric.reductionRate * 100);
    const timeReductionPercent = Math.round(metric.timeReductionRate * 100);
    const costReductionPercent = Math.round(metric.costReductionRate * 100);
    
    return `
    <div class="domain-detail-card">
      <h4>${metric.emoji} ${metric.name}</h4>
      <div class="detail-metrics">
        <div class="detail-item">
          <span class="detail-label">流通削減率</span>
          <span class="detail-value">${reductionPercent}%</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">時間削減率</span>
          <span class="detail-value">${timeReductionPercent}%</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">コスト削減率</span>
          <span class="detail-value">${costReductionPercent}%</span>
        </div>
        ${metric.administrativeDependency > 0 ? `
        <div class="detail-item dependency-info">
          <span class="detail-label">行政依存度</span>
          <span class="detail-value">${Math.round(metric.administrativeDependency * 100)}%</span>
        </div>
        ` : ''}
      </div>
    </div>
  `}).join('');
}

/**
 * 行政DXの波及効果表示
 */
function updateAdminImpact(metrics) {
  const section = document.getElementById('impactDetails');
  if (!section) return;

  const adminMetric = metrics.domainMetrics['administration'];
  if (!adminMetric) return;

  // 行政の現在のモードに基づいてメッセージを生成
  let statusEmoji = '⚠️';
  let statusText = 'Plain（電子化のみ）';
  
  if (metrics.currentMode === 'ai') {
    statusEmoji = '✅';
    statusText = 'AI（完全自動化）';
  } else if (metrics.currentMode === 'smart') {
    statusEmoji = '💡';
    statusText = 'Smart（工夫活用）';
  }

  const impacts = [`<li class="impact-status">${statusEmoji} <strong>行政DX現在状況：${statusText}</strong></li>`];

  // 各分野の依存度と現在の状況を表示
  Object.entries(metrics.domainMetrics).forEach(([domainId, domain]) => {
    if (domainId === 'administration') return;
    
    const depRate = domain.administrativeDependency;
    if (depRate === 0) return;

    let impactText = '';
    const depPercent = Math.round(depRate * 100);
    
    if (metrics.currentMode === 'ai') {
      impactText = `✅ ${domain.name}の処理がスムーズ（行政依存度${depPercent}%）`;
    } else if (metrics.currentMode === 'plain') {
      const degradation = Math.round(depRate * 30); // 最大30%の効率低下
      impactText = `⚠️ ${domain.name}の処理が${degradation}%制限される（行政依存度${depPercent}%）`;
    } else {
      impactText = `→ ${domain.name}の処理が部分的に支援（行政依存度${depPercent}%）`;
    }

    impacts.push(`<li>${impactText}</li>`);
  });

  section.innerHTML = `<ul>${impacts.join('')}</ul>`;
}
