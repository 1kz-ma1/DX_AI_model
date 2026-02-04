// home.js - 分野選択画面のレンダリング（リング/グリッド）

let charactersData = null;
let experienceMode = 'game'; // URLパラメータから取得

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
        <div class="domain-desc">${admin.description || ''}</div>
      `;
      
      centerNode.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('domain.html', { d: admin.id, mode: 'plain', experience: experienceMode });
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
      `;
      
      node.addEventListener('click', (e) => {
        e.preventDefault();
        navigate('domain.html', { d: domain.id, mode: 'plain', experience: experienceMode });
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
    <div class="domain-desc">${domain.description || ''}</div>
  `;
  
  node.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('domain.html', { d: domain.id, mode: 'plain', experience: experienceMode });
  });
  
  return node;
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
