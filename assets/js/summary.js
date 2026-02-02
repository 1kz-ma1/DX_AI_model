// summary.js - まとめページの集計・描画ロジック

// 時間係数
const TIME_COEFF = {
  perManualFieldSec: 8,
  perUploadSec: 25,
  perSignatureSec: 10,
  perAiQAsec: 4
};

// URLパラメータを取得
function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    surgery: params.get('surgery') === '1',
    claim: params.get('claim') === '1',
    hce: params.get('hce') === '1',
    expensive: params.get('expensive') === '1',
    transfer: params.get('transfer') === '1',
    myn: params.get('myn') === '1'
  };
}

// モード別に書類を取得
function getDocumentsForMode(flowsData, params, mode) {
  const docs = [];
  const mynumberUsed = params.myn && mode === 'ai';
  
  // 基本書類
  docs.push(...flowsData.documents.base);
  
  // 条件付き書類
  if (params.surgery) docs.push(...flowsData.documents.surgery);
  if (params.hce) docs.push(...flowsData.documents.hce);
  if (params.claim) docs.push(...flowsData.documents.claim);
  if (params.expensive) docs.push(...flowsData.documents.expensive);
  if (params.transfer) docs.push(...flowsData.documents.transfer);
  
  return docs;
}

// フィールドが手入力かどうかを判定
function isManualInput(field, mode, mynumberUsed) {
  if (!field.source) return true; // source未定義は手入力扱い
  
  switch (field.source) {
    case 'user':
      return true; // 常に手入力
      
    case 'shared':
      return mode === 'plain'; // plainのみ手入力、ai/smartは自動
      
    case 'mynumber':
      if (mode === 'plain') return true;
      if (mode === 'ai' && mynumberUsed) return false; // AIモード＋マイナンバー利用時は自動
      return true;
      
    case 'ai':
      return mode !== 'ai'; // AIモード以外は手入力
      
    case 'derived':
      return mode === 'plain'; // plainのみ手入力、ai/smartは自動
      
    default:
      return true;
  }
}

// モード別統計を計算
function countByMode(flowsData, params, mode) {
  const docs = getDocumentsForMode(flowsData, params, mode);
  const mynumberUsed = params.myn && mode === 'ai';
  
  let total = 0;
  let manual = 0;
  let auto = 0;
  let uploads = 0;
  let signatures = 0;
  
  const byForm = [];
  
  docs.forEach(doc => {
    let docTotal = 0;
    let docManual = 0;
    let autoShared = 0;
    let autoDerived = 0;
    let autoMyn = 0;
    let autoAi = 0;
    let docUploads = 0;
    let docSignatures = 0;
    
    if (doc.fieldDetails && doc.fieldDetails.length > 0) {
      // fieldDetails がある場合
      doc.fieldDetails.forEach(field => {
        if (field.required === false) return; // 任意項目はスキップ
        
        docTotal++;
        const isManual = isManualInput(field, mode, mynumberUsed);
        
        if (isManual) {
          docManual++;
          if (field.type === 'upload') docUploads++;
          if (field.type === 'signature') docSignatures++;
        } else {
          // 自動化されている
          switch (field.source) {
            case 'shared': autoShared++; break;
            case 'derived': autoDerived++; break;
            case 'mynumber': autoMyn++; break;
            case 'ai': autoAi++; break;
          }
        }
      });
    } else {
      // fieldDetails がない場合、inputFields を使用
      const modeKey = mode === 'ai' ? 'ai' : (mode === 'smart' ? 'smart' : 'plain');
      const inputCount = doc.inputFields && doc.inputFields[modeKey] ? doc.inputFields[modeKey] : 8;
      docTotal = inputCount;
      docManual = inputCount;
      
      // 簡易推定：アップロード/署名の割合
      if (doc.type === 'upload') docUploads = 1;
      if (doc.type === 'signature') docSignatures = 1;
    }
    
    total += docTotal;
    manual += docManual;
    auto += (docTotal - docManual);
    uploads += docUploads;
    signatures += docSignatures;
    
    byForm.push({
      id: doc.id,
      name: doc.name,
      total: docTotal,
      manual: docManual,
      autoShared,
      autoDerived,
      autoMyn,
      autoAi,
      uploads: docUploads,
      signatures: docSignatures
    });
  });
  
  return {
    mode,
    total,
    manual,
    auto,
    uploads,
    signatures,
    byForm,
    params
  };
}

// 削減内訳を計算
function computeReductions(plainStats, aiStats) {
  let shared = 0, derived = 0, myn = 0, ai = 0;
  
  aiStats.byForm.forEach(aiForm => {
    shared += aiForm.autoShared;
    derived += aiForm.autoDerived;
    myn += aiForm.autoMyn;
    ai += aiForm.autoAi;
  });
  
  return { shared, derived, myn, ai };
}

// 時間を見積もる（秒）
function estimateTimeSec(stats) {
  let time = 0;
  time += stats.manual * TIME_COEFF.perManualFieldSec;
  time += stats.uploads * TIME_COEFF.perUploadSec;
  time += stats.signatures * TIME_COEFF.perSignatureSec;
  
  // AIモードの場合、AI対話時間を追加（フィールド数の25%を質問数と仮定）
  if (stats.mode === 'ai') {
    const aiQuestions = Math.ceil(stats.auto * 0.25);
    time += aiQuestions * TIME_COEFF.perAiQAsec;
  }
  
  return time;
}

// パーセンテージ計算
function calcPercent(from, to) {
  if (from === 0) return 0;
  return Math.round(((from - to) / from) * 100);
}

// 描画処理
function render(flowsData) {
  const params = getParams();
  
  // シナリオバッジの表示
  document.getElementById('b-surgery').classList.toggle('active', params.surgery);
  document.getElementById('b-claim').classList.toggle('active', params.claim);
  document.getElementById('b-hce').classList.toggle('active', params.hce);
  document.getElementById('b-myn').classList.toggle('active', params.myn);
  
  // Plain と AI の統計を計算
  const plainStats = countByMode(flowsData, params, 'plain');
  const aiStats = countByMode(flowsData, params, 'ai');
  
  // KPI表示
  const manualPct = calcPercent(plainStats.manual, aiStats.manual);
  const uploadPct = calcPercent(plainStats.uploads, aiStats.uploads);
  
  document.getElementById('kpi-manual').textContent = `-${manualPct}%`;
  document.getElementById('kpi-manual-sub').textContent = `${plainStats.manual} → ${aiStats.manual} 項目`;
  
  document.getElementById('kpi-upload').textContent = `-${uploadPct}%`;
  document.getElementById('kpi-upload-sub').textContent = `${plainStats.uploads} → ${aiStats.uploads} 回`;
  
  const plainTimeSec = estimateTimeSec(plainStats);
  const aiTimeSec = estimateTimeSec(aiStats);
  const plainTimeMin = Math.round(plainTimeSec / 60);
  const aiTimeMin = Math.round(aiTimeSec / 60);
  const timeDiffMin = plainTimeMin - aiTimeMin;
  
  document.getElementById('kpi-time').textContent = `${timeDiffMin} 分短縮`;
  document.getElementById('kpi-time-sub').textContent = `${plainTimeMin} 分 → ${aiTimeMin} 分`;
  
  // ウォーターフォール
  const reductions = computeReductions(plainStats, aiStats);
  const totalReduction = reductions.shared + reductions.derived + reductions.myn + reductions.ai;
  
  if (totalReduction > 0) {
    const wfBars = document.getElementById('wf-bars');
    wfBars.innerHTML = '';
    
    const categories = [
      { key: 'shared', label: '共通', value: reductions.shared, class: 'shared' },
      { key: 'derived', label: '派生', value: reductions.derived, class: 'derived' },
      { key: 'myn', label: 'マイナンバー', value: reductions.myn, class: 'mynumber' },
      { key: 'ai', label: 'AI', value: reductions.ai, class: 'ai' }
    ];
    
    categories.forEach(cat => {
      if (cat.value > 0) {
        const pct = Math.round((cat.value / totalReduction) * 100);
        const bar = document.createElement('div');
        bar.className = `wf-bar ${cat.class}`;
        bar.style.width = `${pct}%`;
        bar.textContent = `${cat.label}: ${cat.value}`;
        bar.title = `${cat.label}: ${cat.value}項目 (${pct}%)`;
        wfBars.appendChild(bar);
      }
    });
  }
  
  // スロープ（削減幅トップ3）
  const formReductions = aiStats.byForm
    .map(aiForm => {
      const plainForm = plainStats.byForm.find(pf => pf.id === aiForm.id);
      const plainManual = plainForm ? plainForm.manual : aiForm.manual;
      const reduction = plainManual - aiForm.manual;
      return { ...aiForm, plainManual, reduction };
    })
    .filter(f => f.reduction > 0)
    .sort((a, b) => b.reduction - a.reduction)
    .slice(0, 3);
  
  const slopeContainer = document.getElementById('slope');
  slopeContainer.innerHTML = '';
  
  formReductions.forEach(form => {
    const item = document.createElement('div');
    item.className = 'slope-item';
    
    const plainWidth = Math.max(10, (form.plainManual / plainStats.manual) * 100);
    const aiWidth = Math.max(10, (form.manual / plainStats.manual) * 100);
    
    item.innerHTML = `
      <div class="slope-name">${form.name}</div>
      <div class="slope-bars">
        <div class="slope-bar plain" style="width: ${plainWidth}%;">${form.plainManual}</div>
        <div class="slope-bar ai" style="width: ${aiWidth}%;">${form.manual}</div>
        <div class="slope-diff">−${form.reduction}</div>
      </div>
    `;
    
    slopeContainer.appendChild(item);
  });
  
  // タイムライン
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  
  const timelineData = [
    {
      label: '手入力時間',
      plain: plainStats.manual * TIME_COEFF.perManualFieldSec,
      ai: aiStats.manual * TIME_COEFF.perManualFieldSec
    },
    {
      label: 'アップロード時間',
      plain: plainStats.uploads * TIME_COEFF.perUploadSec,
      ai: aiStats.uploads * TIME_COEFF.perUploadSec
    },
    {
      label: 'AI対話時間',
      plain: 0,
      ai: Math.ceil(aiStats.auto * 0.25) * TIME_COEFF.perAiQAsec
    }
  ];
  
  timelineData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'timeline-card';
    const diff = item.plain - item.ai;
    const diffText = diff > 0 ? `−${diff}秒` : diff < 0 ? `+${Math.abs(diff)}秒` : '±0秒';
    
    card.innerHTML = `
      <div class="timeline-label">${item.label}</div>
      <div class="timeline-values">
        <div class="timeline-value">
          <span class="label">Plain:</span>
          <span class="value">${item.plain}秒</span>
        </div>
        <div class="timeline-value">
          <span class="label">AI:</span>
          <span class="value">${item.ai}秒</span>
        </div>
        <div class="timeline-value diff">${diffText}</div>
      </div>
    `;
    
    timeline.appendChild(card);
  });
  
  // 書類カード
  const formsContainer = document.getElementById('forms');
  formsContainer.innerHTML = '';
  
  aiStats.byForm.forEach(aiForm => {
    const plainForm = plainStats.byForm.find(pf => pf.id === aiForm.id);
    const plainManual = plainForm ? plainForm.manual : aiForm.manual;
    const reduction = plainManual - aiForm.manual;
    const diffText = reduction > 0 ? `−${reduction}` : '±0';
    
    const card = document.createElement('div');
    card.className = 'form-card';
    
    // ミニ積み上げバー
    const segments = [];
    if (aiForm.autoShared > 0) segments.push({ class: 'shared', width: aiForm.autoShared });
    if (aiForm.autoDerived > 0) segments.push({ class: 'derived', width: aiForm.autoDerived });
    if (aiForm.autoMyn > 0) segments.push({ class: 'mynumber', width: aiForm.autoMyn });
    if (aiForm.autoAi > 0) segments.push({ class: 'ai-auto', width: aiForm.autoAi });
    if (aiForm.manual > 0) segments.push({ class: 'manual', width: aiForm.manual });
    
    const totalWidth = segments.reduce((sum, s) => sum + s.width, 0);
    const barHTML = segments.map(s => {
      const pct = totalWidth > 0 ? (s.width / totalWidth) * 100 : 0;
      return `<div class="form-bar-segment ${s.class}" style="width: ${pct}%" title="${s.width}項目"></div>`;
    }).join('');
    
    card.innerHTML = `
      <div class="form-card-header">
        <div class="form-card-name">${aiForm.name}</div>
        <div class="form-card-diff">${plainManual} → ${aiForm.manual} (${diffText})</div>
      </div>
      <div class="form-card-bar">${barHTML}</div>
    `;
    
    formsContainer.appendChild(card);
  });
}

// DOMContentLoaded時に実行
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('assets/data/flows.json');
    if (!response.ok) throw new Error('Failed to load flows.json');
    const flowsData = await response.json();
    render(flowsData);
  } catch (error) {
    console.error('Error:', error);
    document.querySelector('.container').innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <h2 style="color: #ef4444;">データの読み込みに失敗しました</h2>
        <p style="color: #6b7280; margin-top: 12px;">flows.json が見つからないか、読み込めませんでした。</p>
        <a href="index.html" class="back-btn" style="margin-top: 20px; display: inline-flex;">← 体験アプリに戻る</a>
      </div>
    `;
  }
});
