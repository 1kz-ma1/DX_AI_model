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
    // 中心からの距離
    const radius = 220;
    
    // 行政DXを最初に中央に配置
    const admin = domains.find(d => d.id === 'administration');
    if (admin) {
      const centerNode = document.createElement('a');
      centerNode.className = 'domain-node center';
      centerNode.href = '#';
      centerNode.setAttribute('role', 'button');
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
        e.preventDefault();
        if (experienceMode === 'demo') {
          // デモモード時：行政分野は分析ページへ
          if (!e.target.closest('.mode-btn')) {
            navigateToAnalysis(admin.id);
          }
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
      node.setAttribute('aria-label', `${domain.name}の体験へ移動`);
      
      // 12時の位置を起点に時計回りに配置
      const angle = (index / otherDomains.length) * 2 * Math.PI - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      node.style.left = `calc(50% + ${x}px - 70px)`;
      node.style.top = `calc(50% + ${y}px - 70px)`;
      
      node.innerHTML = `
        <div class="domain-emoji">${domain.emoji}</div>
        <div class="domain-name">${domain.name}</div>
        <div class="domain-desc">${domain.description || ''}</div>
        ${experienceMode === 'demo' ? createModeButtons(domain.id) : ''}
      `;
      
      node.addEventListener('click', (e) => {
        e.preventDefault();
        if (experienceMode === 'demo') {
          // デモモード時：モードボタン以外のクリックは無視
          if (!e.target.closest('.mode-btn')) {
            return;
          }
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
  node.setAttribute('aria-label', `${domain.name}の体験へ移動`);
  
  node.innerHTML = `
    <div class="domain-emoji">${domain.emoji}</div>
    <div class="domain-name">${domain.name}</div>
    ${experienceMode === 'demo' && domain.id === 'administration' ? '<div class="analysis-badge">📊 クリックで統計分析</div>' : ''}
    <div class="domain-desc">${domain.description || ''}</div>
    ${experienceMode === 'demo' ? createModeButtons(domain.id) : ''}
  `;
  
  node.addEventListener('click', (e) => {
    e.preventDefault();
    if (experienceMode === 'demo') {
      // デモモード時
      if (domain.id === 'administration' && !e.target.closest('.mode-btn')) {
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
    <div class="mode-buttons" onclick="event.stopPropagation()">
      <button class="mode-btn ${currentMode === 'plain' ? 'active' : ''}" data-mode="plain" data-domain="${domainId}">
        Plain
      </button>
      <button class="mode-btn ${currentMode === 'smart' ? 'active' : ''}" data-mode="smart" data-domain="${domainId}">
        Smart
      </button>
      <button class="mode-btn ${currentMode === 'ai' ? 'active' : ''}" data-mode="ai" data-domain="${domainId}">
        AI
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
  console.log('Navigating to analysis page with modes:', domainModes);
  // 全分野のモード状態を渡す
  const modeParams = {};
  Object.keys(domainModes).forEach(id => {
    modeParams[`${id}_mode`] = domainModes[id];
  });
  
  navigate('demo-analysis.html', { 
    experience: 'demo',
    domain: domainId,
    ...modeParams
  });
}

// モードボタンのイベントリスナー（イベント委譲）
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('mode-btn') && experienceMode === 'demo') {
    const btn = e.target;
    const mode = btn.dataset.mode;
    const domainId = btn.dataset.domain;
    
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
  }
});

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
    const reductionRate = metrics.reductionRates?.[mode] || 0;
    const timeReduction = metrics.timeReductionRates?.[mode] || 0;
    const costReduction = metrics.costReductionPercentage || 0;
    
    // 統計表示エリアを更新
    const statsDiv = document.getElementById(`stats-${domainId}`);
    if (statsDiv) {
      statsDiv.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">書類削減率:</span> 
          <span class="stat-value">${(reductionRate * 100).toFixed(1)}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">時間短縮:</span> 
          <span class="stat-value">${(timeReduction * 100).toFixed(1)}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">コスト削減:</span> 
          <span class="stat-value">${costReduction.toFixed(1)}%</span>
        </div>
      `;
      
      // フラッシュアニメーション
      statsDiv.classList.add('stats-flash');
      setTimeout(() => statsDiv.classList.remove('stats-flash'), 500);
    }
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
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
