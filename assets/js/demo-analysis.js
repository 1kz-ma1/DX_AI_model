/**
 * demo-analysis.js - デモモード分析ページのロジック
 * 社会全体のDX×AI導入による影響を動的に計算・表示
 */

let currentMode = 'smart';
let domainsData = null;
let demoMetricsCache = {};
let volumeChart = null;
let timeChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // URLパラメータから初期モードを取得
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode')) {
      currentMode = params.get('mode');
    }

    // domains.jsonを読み込み
    const response = await fetch('assets/data/domains.json');
    domainsData = await response.json();

    // demoMetricsをキャッシュ
    domainsData.domains.forEach(domain => {
      if (domain.demoMetrics) {
        demoMetricsCache[domain.id] = domain.demoMetrics;
      }
    });

    // UI初期化
    initUI();

    // 初期描画
    updateAnalysis();
  } catch (error) {
    console.error('Failed to load data:', error);
    alert('データの読み込みに失敗しました');
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
      navigate('domain.html', { experienceMode: 'demo' });
    });
  }

  if (backToDomainBtn) {
    backToDomainBtn.addEventListener('click', () => {
      navigate('domain.html', { experienceMode: 'demo' });
    });
  }

  if (backToHubBtn) {
    backToHubBtn.addEventListener('click', () => {
      navigate('home.html', { experienceMode: 'demo' });
    });
  }

  // モード切り替えボタン
  document.querySelectorAll('.mode-btn').forEach(btn => {
    if (btn.dataset.mode === currentMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      const newMode = btn.dataset.mode;
      if (newMode !== currentMode) {
        currentMode = newMode;
        
        // ボタンの状態更新
        document.querySelectorAll('.mode-btn').forEach(b => {
          b.classList.remove('active');
        });
        btn.classList.add('active');

        // 分析更新
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
 */
function calculateMetrics() {
  const costPerHour = domainsData.meta.demoMetaInfo?.costPerHour || 3000;
  
  let totalDailyVolume = 0;
  let totalProcessedAfter = 0;
  let totalTimeAfter = 0;
  let totalCostAfter = 0;
  const domainMetrics = {};

  // 各分野のメトリクス計算
  domainsData.domains.forEach(domain => {
    const metrics = demoMetricsCache[domain.id];
    if (!metrics) return;

    const dailyVolume = metrics.dailyVolume;
    const reductionRate = metrics.reductionRates[currentMode] || 0;
    const timeReductionRate = metrics.timeReductionRates[currentMode] || 0;
    const costReductionRate = metrics.costReductionPercentage[currentMode] || 0;

    const processedAfter = Math.round(dailyVolume * (1 - reductionRate));
    const timeAfter = Math.round(metrics.averageTimePerCase * processedAfter * (1 - timeReductionRate) / 60);
    const costAfter = Math.round(timeAfter * costPerHour * (1 - costReductionRate));

    totalDailyVolume += dailyVolume;
    totalProcessedAfter += processedAfter;
    totalTimeAfter += timeAfter;
    totalCostAfter += costAfter;

    // 行政への依存度による補正（行政がAIレベルにない場合は効率が落ちる）
    const adminDependency = metrics.administrativeDependency || 0;
    let adjustedReduction = reductionRate;

    // 行政がPlain/Smartレベルの場合、この分野の効率も低下
    if (currentMode === 'smart' || currentMode === 'plain') {
      // 行政がAIレベルじゃない場合の補正
      if (currentMode === 'plain') {
        adjustedReduction = reductionRate * (1 - adminDependency * 0.5);
      }
    }

    domainMetrics[domain.id] = {
      name: domain.name,
      emoji: domain.emoji,
      dailyVolume,
      reductionRate: adjustedReduction,
      processedBefore: dailyVolume,
      processedAfter: Math.round(dailyVolume * (1 - adjustedReduction)),
      timePerCase: metrics.averageTimePerCase,
      timeReductionRate,
      costReductionRate,
      administrativeDependency: adminDependency,
      impactOnOtherDomains: metrics.impactOnOtherDomains || {}
    };
  });

  // 行政DXの波及効果を計算
  const adminMetrics = domainMetrics['administration'];
  let adminImpactAdjustment = 0;
  if (adminMetrics && currentMode === 'ai') {
    // 行政がAI導入されている場合、他分野の効率が向上
    adminImpactAdjustment = 0.1; // 最大10%の追加効率化
  } else if (adminMetrics && currentMode === 'plain') {
    // 行政がPlain状態の場合、他分野の効率が低下
    adminImpactAdjustment = -0.15; // 最大15%の効率低下
  }

  return {
    currentMode,
    totalDailyVolume,
    totalProcessedAfter,
    totalTimeAfter,
    totalCostAfter,
    domainMetrics,
    adminImpactAdjustment,
    costPerHour
  };
}

/**
 * メトリクス表示更新
 */
function updateMetricsDisplay(metrics) {
  const totalReduction = 1 - (metrics.totalProcessedAfter / metrics.totalDailyVolume);
  const reductionPercentage = Math.round(totalReduction * 100);
  
  const totalTimeHours = Math.round(metrics.totalTimeAfter / 60);
  const yearlyTimeSaving = Math.round(totalTimeHours * 250 / 8); // 営業日ベース

  const monthlyCost = Math.round(metrics.totalCostAfter / 20); // 営業日ベース月換算

  document.getElementById('reductionPercentage').textContent = `${reductionPercentage}%`;
  document.getElementById('reductionDetail').textContent = 
    `${metrics.totalDailyVolume.toLocaleString()} → ${metrics.totalProcessedAfter.toLocaleString()} 件`;

  document.getElementById('timeSaving').textContent = `${totalTimeHours}時間`;
  document.getElementById('timeSavingDetail').textContent = 
    `年間 ${yearlyTimeSaving} 日分`;

  document.getElementById('costSaving').textContent = 
    `￥${monthlyCost.toLocaleString()}`;
  document.getElementById('costSavingDetail').textContent = '月額削減';

  // 行政DXの波及効果
  const adminImpactPercent = Math.round(metrics.adminImpactAdjustment * 100);
  const adminImpactSign = adminImpactPercent >= 0 ? '+' : '';
  document.getElementById('adminImpact').textContent = 
    `${adminImpactSign}${adminImpactPercent}%`;
  document.getElementById('adminImpactDetail').textContent = 
    metrics.currentMode === 'ai' ? '行政DX全導入による波及効果' :
    metrics.currentMode === 'plain' ? '行政DX未実施による悪影響' :
    '部分的な行政DX効果';
}

/**
 * グラフ更新
 */
function updateCharts(metrics) {
  const domainIds = Object.keys(metrics.domainMetrics);
  const domainNames = domainIds.map(id => metrics.domainMetrics[id].name);
  const domainEmojis = domainIds.map(id => metrics.domainMetrics[id].emoji);

  // 処理件数グラフ
  const volumeData = domainIds.map(id => ({
    before: metrics.domainMetrics[id].processedBefore,
    after: metrics.domainMetrics[id].processedAfter
  }));

  updateVolumeChart(domainNames, domainEmojis, volumeData);

  // 時間削減グラフ
  const timeData = domainIds.map(id => {
    const metric = metrics.domainMetrics[id];
    const timeBefore = Math.round(metric.timePerCase * metric.processedBefore / 60);
    const timeAfter = Math.round(metric.timePerCase * metric.processedAfter / 60);
    return { before: timeBefore, after: timeAfter };
  });

  updateTimeChart(domainNames, domainEmojis, timeData);
}

/**
 * 処理件数グラフ更新
 */
function updateVolumeChart(labels, emojis, data) {
  const ctx = document.getElementById('volumeChart')?.getContext('2d');
  if (!ctx) return;

  const chartLabels = labels.map((label, i) => `${emojis[i]} ${label}`);
  const beforeData = data.map(d => d.before);
  const afterData = data.map(d => d.after);

  if (volumeChart) {
    volumeChart.destroy();
  }

  volumeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: '削減前',
          data: beforeData,
          backgroundColor: 'rgba(229, 231, 235, 0.8)',
          borderColor: 'rgb(107, 114, 128)',
          borderWidth: 1
        },
        {
          label: '削減後',
          data: afterData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(37, 99, 235)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '処理件数'
          }
        }
      }
    }
  });
}

/**
 * 時間削減グラフ更新
 */
function updateTimeChart(labels, emojis, data) {
  const ctx = document.getElementById('timeChart')?.getContext('2d');
  if (!ctx) return;

  const chartLabels = labels.map((label, i) => `${emojis[i]} ${label}`);
  const beforeData = data.map(d => d.before);
  const afterData = data.map(d => d.after);

  if (timeChart) {
    timeChart.destroy();
  }

  timeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: '削減前（時間）',
          data: beforeData,
          backgroundColor: 'rgba(249, 115, 22, 0.8)',
          borderColor: 'rgb(217, 119, 6)',
          borderWidth: 1
        },
        {
          label: '削減後（時間）',
          data: afterData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(22, 163, 74)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '時間（時間）'
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

  grid.innerHTML = Object.entries(metrics.domainMetrics).map(([id, metric]) => `
    <div class="domain-detail-card">
      <h4>${metric.emoji} ${metric.name}</h4>
      <div class="detail-metrics">
        <div class="detail-item">
          <span class="detail-label">処理件数</span>
          <span class="detail-value">${metric.processedAfter.toLocaleString()}件</span>
          <span class="detail-change">-${Math.round(metric.reductionRate * 100)}%</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">時間削減</span>
          <span class="detail-value">${Math.round(metric.timeReductionRate * 100)}%</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">コスト削減</span>
          <span class="detail-value">${Math.round(metric.costReductionRate * 100)}%</span>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * 行政DXの波及効果表示
 */
function updateAdminImpact(metrics) {
  const section = document.getElementById('impactDetails');
  if (!section) return;

  const adminMetric = metrics.domainMetrics['administration'];
  if (!adminMetric) return;

  const impacts = [];
  const impactMap = adminMetric.impactOnOtherDomains || {};

  Object.entries(impactMap).forEach(([domainId, dependencyRate]) => {
    const domain = metrics.domainMetrics[domainId];
    if (!domain) return;

    let impactText = '';
    if (metrics.currentMode === 'ai') {
      impactText = `✅ ${domain.name}の効率が${Math.round(dependencyRate * 100)}%向上`;
    } else if (metrics.currentMode === 'plain') {
      impactText = `⚠️ ${domain.name}の効率が${Math.round(dependencyRate * 50)}%低下（行政DX未実施）`;
    } else {
      impactText = `→ ${domain.name}に${Math.round(dependencyRate * 100)}%の依存度`;
    }

    impacts.push(`<li>${impactText}</li>`);
  });

  section.innerHTML = `<ul>${impacts.join('')}</ul>`;
}
