// home.js - ハブのレンダリング（リング/グリッド）

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // domains.jsonを読み込み
    const response = await fetch('assets/data/domains.json');
    if (!response.ok) throw new Error('Failed to load domains.json');
    const data = await response.json();
    
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
        navigate('domain.html', { d: admin.id, mode: 'plain' });
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
        navigate('domain.html', { d: domain.id, mode: 'plain' });
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
    navigate('domain.html', { d: domain.id, mode: 'plain' });
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
