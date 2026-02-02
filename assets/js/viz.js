/**
 * viz.js - Visualization Components
 * 積み上げ棒グラフ等の可視化コンポーネント（外部ライブラリ不使用）
 */

/**
 * 積み上げ棒グラフを描画
 * @param {HTMLElement} container - 描画先の要素
 * @param {Array} data - データ配列 [{name: string, manual: number, auto: number, removed: number}]
 */
function renderStackedBar(container, data) {
  if (!container || !data || data.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-gray-500);">データがありません</p>';
    return;
  }

  // 最大値を計算（スケール用）
  const maxTotal = Math.max(...data.map(d => d.manual + d.auto + d.removed));
  
  // SVG要素を作成
  const width = container.clientWidth || 800;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 60, left: 100 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  // 背景
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', width);
  bg.setAttribute('height', height);
  bg.setAttribute('fill', '#ffffff');
  svg.appendChild(bg);
  
  // チャートグループ
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
  svg.appendChild(g);
  
  // バー描画
  const barHeight = chartHeight / data.length * 0.7;
  const barSpacing = chartHeight / data.length;
  
  data.forEach((item, i) => {
    const y = i * barSpacing + (barSpacing - barHeight) / 2;
    const total = item.manual + item.auto + item.removed;
    const scale = total > 0 ? chartWidth / maxTotal : 0;
    
    let x = 0;
    
    // 手入力（赤）
    if (item.manual > 0) {
      const width = item.manual * scale;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', width);
      rect.setAttribute('height', barHeight);
      rect.setAttribute('fill', '#ef4444');
      rect.setAttribute('rx', 4);
      g.appendChild(rect);
      
      // テキスト
      if (width > 30) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x + width / 2);
        text.setAttribute('y', y + barHeight / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.textContent = item.manual;
        g.appendChild(text);
      }
      
      x += width;
    }
    
    // 自動（緑）
    if (item.auto > 0) {
      const width = item.auto * scale;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', width);
      rect.setAttribute('height', barHeight);
      rect.setAttribute('fill', '#10b981');
      rect.setAttribute('rx', 4);
      g.appendChild(rect);
      
      if (width > 30) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x + width / 2);
        text.setAttribute('y', y + barHeight / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.textContent = item.auto;
        g.appendChild(text);
      }
      
      x += width;
    }
    
    // 不要（グレー）
    if (item.removed > 0) {
      const width = item.removed * scale;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', width);
      rect.setAttribute('height', barHeight);
      rect.setAttribute('fill', '#94a3b8');
      rect.setAttribute('rx', 4);
      g.appendChild(rect);
      
      if (width > 30) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x + width / 2);
        text.setAttribute('y', y + barHeight / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.textContent = item.removed;
        g.appendChild(text);
      }
    }
    
    // ラベル（左側）
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', -10);
    label.setAttribute('y', y + barHeight / 2);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('fill', '#374151');
    label.setAttribute('font-size', '14');
    label.textContent = item.name;
    g.appendChild(label);
    
    // 合計（右側）
    const totalText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    totalText.setAttribute('x', chartWidth + 10);
    totalText.setAttribute('y', y + barHeight / 2);
    totalText.setAttribute('text-anchor', 'start');
    totalText.setAttribute('dominant-baseline', 'middle');
    totalText.setAttribute('fill', '#374151');
    totalText.setAttribute('font-size', '12');
    totalText.setAttribute('font-weight', 'bold');
    totalText.textContent = `計: ${total}`;
    g.appendChild(totalText);
  });
  
  container.innerHTML = '';
  container.appendChild(svg);
}

/**
 * 削減率を計算
 * @param {number} before - 削減前の項目数
 * @param {number} after - 削減後の項目数
 * @returns {number} 削減率（0-100）
 */
function calculateReductionRate(before, after) {
  if (before === 0) return 0;
  return Math.round(((before - after) / before) * 100);
}

/**
 * パーセンテージバーを描画
 * @param {HTMLElement} container - 描画先の要素
 * @param {number} percentage - パーセンテージ（0-100）
 * @param {string} color - バーの色
 */
function renderPercentageBar(container, percentage, color = '#667eea') {
  const bar = document.createElement('div');
  bar.style.cssText = `
    width: 100%;
    height: 24px;
    background: #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
  `;
  
  const fill = document.createElement('div');
  fill.style.cssText = `
    width: ${Math.min(100, Math.max(0, percentage))}%;
    height: 100%;
    background: ${color};
    transition: width 0.5s ease;
    border-radius: 12px;
  `;
  
  const text = document.createElement('span');
  text.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 12px;
    font-weight: bold;
    color: #374151;
  `;
  text.textContent = `${percentage}%`;
  
  bar.appendChild(fill);
  bar.appendChild(text);
  container.innerHTML = '';
  container.appendChild(bar);
}
