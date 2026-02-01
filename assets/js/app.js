/**
 * 入院手続き DX × AI 体験アプリ
 * Phase 1 対応版
 */

class HospitalizationDXApp {
  constructor() {
    this.flowsData = null;
    this.currentMode = 'plain';
    this.currentStep = 'intro';
    this.formData = {};
    this.checklist = {
      surgery: false,
      hce: false,
      claim: false,
      proxy: false,
      expensive: false,
      transfer: false
    };
    this.init();
  }

  async init() {
    try {
      const response = await fetch('assets/data/flows.json');
      this.flowsData = await response.json();
      this.setupIntroScreen();
      this.initializeUI();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to load flows.json:', error);
    }
  }

  setupIntroScreen() {
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => this.transitionToStep1());
  }

  async transitionToStep1() {
    const introScreen = document.getElementById('introScreen');
    const step1 = document.getElementById('step1');

    introScreen.style.transition = 'opacity 0.4s ease-out';
    introScreen.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 400));

    introScreen.style.display = 'none';
    step1.style.display = 'block';
    this.currentStep = 'step1';

    step1.style.opacity = '0';
    step1.offsetHeight;
    step1.style.transition = 'opacity 0.4s ease-in';
    step1.style.opacity = '1';
  }

  async transitionToStep2() {
    if (!this.validateForm()) {
      alert('必須項目を入力してください。');
      return;
    }

    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');

    step1.style.transition = 'opacity 0.4s ease-out';
    step1.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 400));

    step1.style.display = 'none';
    step2.style.display = 'block';
    this.currentStep = 'step2';

    step2.style.opacity = '0';
    step2.offsetHeight;
    step2.style.transition = 'opacity 0.4s ease-in';
    step2.style.opacity = '1';

    this.renderMode(this.currentMode);
  }

  async transitionBackToStep1() {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');

    step2.style.transition = 'opacity 0.4s ease-out';
    step2.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 400));

    step2.style.display = 'none';
    step1.style.display = 'block';
    this.currentStep = 'step1';

    step1.style.opacity = '0';
    step1.offsetHeight;
    step1.style.transition = 'opacity 0.4s ease-in';
    step1.style.opacity = '1';
  }

  initializeUI() {
    this.generateBaseForm();
    this.generateChecklist();
    this.renderMode('plain');
  }

  generateBaseForm() {
    const form = document.getElementById('baseForm');
    form.innerHTML = '';

    this.flowsData.baseQuestions.forEach(question => {
      const group = document.createElement('div');
      group.className = 'form-group';

      const label = document.createElement('label');
      label.htmlFor = question.id;
      label.textContent = question.label + (question.required ? ' *' : '');

      let input;
      if (question.type === 'select') {
        input = document.createElement('select');
        input.id = question.id;
        input.required = question.required;

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '選択してください';
        input.appendChild(placeholder);

        question.options.forEach(option => {
          const opt = document.createElement('option');
          opt.value = option.value;
          opt.textContent = option.label;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement('input');
        input.id = question.id;
        input.type = question.type;
        input.placeholder = question.placeholder || '';
        input.required = question.required;
      }

      input.addEventListener('change', (e) => {
        this.formData[question.id] = e.target.value;
      });

      group.appendChild(label);
      group.appendChild(input);
      form.appendChild(group);
    });
  }

  generateChecklist() {
    const container = document.getElementById('checklistContainer');
    container.innerHTML = '';

    this.flowsData.checklist.forEach(item => {
      const label = document.createElement('label');
      label.className = 'checklist-item';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = item.id;
      input.addEventListener('change', (e) => {
        this.checklist[item.key] = e.target.checked;
        // リアルタイム更新
        if (this.currentMode !== 'plain') {
          this.renderMode(this.currentMode);
        }
      });

      const labelText = document.createElement('label');
      labelText.htmlFor = item.id;
      labelText.textContent = item.label;

      label.appendChild(input);
      label.appendChild(labelText);
      container.appendChild(label);
    });
  }

  attachEventListeners() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.switchMode(mode);
      });
    });

    document.getElementById('nextToStep2Btn').addEventListener('click', () => {
      this.transitionToStep2();
    });

    document.getElementById('backToStep1Btn').addEventListener('click', () => {
      this.transitionBackToStep1();
    });
  }

  validateForm() {
    const form = document.getElementById('baseForm');
    const requiredFields = form.querySelectorAll('[required]');

    let isValid = true;
    requiredFields.forEach(field => {
      if (!field.value) {
        isValid = false;
        field.style.borderColor = '#ef4444';
      } else {
        field.style.borderColor = '#d1d5db';
      }
    });

    return isValid;
  }

  switchMode(mode) {
    this.currentMode = mode;

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      }
    });

    this.renderMode(mode);
  }

  renderMode(mode) {
    const modeInfo = this.flowsData.modes[mode];
    document.getElementById('modeTitle').textContent = modeInfo.title;
    document.getElementById('modeDesc').textContent = modeInfo.description;

    document.querySelectorAll('.result-panel').forEach(panel => {
      panel.style.display = 'none';
    });

    switch (mode) {
      case 'plain':
        this.renderPlainMode();
        break;
      case 'smart':
        this.renderSmartMode();
        break;
      case 'ai':
        this.renderAIMode();
        break;
    }
  }

  renderPlainMode() {
    const panel = document.getElementById('plainResult');
    panel.style.display = 'block';

    const container = document.getElementById('plainDocuments');
    container.innerHTML = '';

    // バッジの表示
    this.displayModeBadges('plain', container);

    const allDocs = this.getAllDocuments();
    allDocs.forEach(doc => {
      const item = this.createDocumentItem(doc, 'plain');
      container.appendChild(item);
    });

    this.updateStats(allDocs.length, allDocs.length);
  }

  renderSmartMode() {
    const panel = document.getElementById('smartResult');
    panel.style.display = 'block';

    const container = document.getElementById('smartDocuments');
    container.innerHTML = '';

    // バッジの表示
    const docs = [...this.flowsData.documents.base];
    const warnings = [];

    if (this.checklist.surgery) {
      docs.push(...this.flowsData.documents.surgery);
    } else {
      warnings.push('手術を受けたか：チェックで判定');
    }

    if (this.checklist.hce) {
      docs.push(...this.flowsData.documents.hce);
    } else {
      warnings.push('高額療養費：チェックで判定');
    }

    if (this.checklist.claim) {
      docs.push(...this.flowsData.documents.claim);
    } else {
      warnings.push('医療保険請求：チェックで判定');
    }

    if (this.checklist.proxy) {
      docs.push(...this.flowsData.documents.proxy);
    } else {
      warnings.push('代理人による手続き：チェックで判定');
    }

    if (this.checklist.expensive) {
      docs.push(...this.flowsData.documents.expensive);
    } else {
      warnings.push('高額医療費申請：チェックで判定');
    }

    if (this.checklist.transfer) {
      docs.push(...this.flowsData.documents.transfer);
    } else {
      warnings.push('転院の予定：チェックで判定');
    }

    this.displayModeBadges('smart', container, docs.length, warnings.length);

    docs.forEach(doc => {
      const item = this.createDocumentItem(doc, 'smart');
      container.appendChild(item);
    });

    const warningList = document.getElementById('smartWarnings');
    warningList.innerHTML = '';
    warnings.forEach(warning => {
      const li = document.createElement('li');
      li.textContent = warning;
      warningList.appendChild(li);
    });

    this.updateStats(docs.length, this.getAllDocuments().length);
  }

  async renderAIMode() {
    const panel = document.getElementById('aiResult');
    const dialogPanel = document.getElementById('aiDialogPanel');
    const docsPanel = document.getElementById('aiDocumentsPanel');

    panel.style.display = 'block';
    dialogPanel.style.display = 'none';
    docsPanel.style.display = 'none';

    await fadeIn(dialogPanel, 300);

    const typingElement = document.getElementById('aiTypingText');
    const typing = new TypingAnimation(typingElement, 40);

    let aiResponse = '状況を整理しています...\n\n';

    if (this.checklist.surgery) {
      aiResponse += '✓ 手術を受けられました\n';
    } else {
      aiResponse += '✗ 手術は受けていません\n';
    }

    if (this.checklist.hce) {
      aiResponse += '✓ 高額療養費制度を申請します\n';
    } else {
      aiResponse += '✗ 高額療養費制度は不要です\n';
    }

    if (this.checklist.claim) {
      aiResponse += '✓ 医療保険の給付金を請求します\n';
    } else {
      aiResponse += '✗ 医療保険請求は不要です\n';
    }

    if (this.checklist.proxy) {
      aiResponse += '✓ 代理人が手続きを行います\n';
    } else {
      aiResponse += '✗ ご本人が手続きされます\n';
    }

    if (this.checklist.expensive) {
      aiResponse += '✓ 高額医療費申請を行います\n';
    } else {
      aiResponse += '✗ 高額医療費申請は不要です\n';
    }

    if (this.checklist.transfer) {
      aiResponse += '✓ 転院を予定されています\n';
    } else {
      aiResponse += '✗ 転院の予定はありません\n';
    }

    aiResponse += '\n必要な書類を最小限に整理しました...';

    await typing.type(aiResponse);

    await new Promise(resolve => setTimeout(resolve, 500));
    await fadeIn(docsPanel, 300);

    const necessaryDocs = this.generateNecessaryDocuments();
    const container = document.getElementById('aiDocuments');
    container.innerHTML = '';

    this.displayModeBadges('ai', container, necessaryDocs.length);

    necessaryDocs.forEach(doc => {
      const item = this.createDocumentItem(doc, 'ai');
      container.appendChild(item);
    });

    this.updateStats(necessaryDocs.length, this.getAllDocuments().length);
  }

  displayModeBadges(mode, container, docCount, warningCount) {
    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'header-badges';

    if (mode === 'plain') {
      const inputBadge = document.createElement('span');
      inputBadge.className = 'badge input-count';
      inputBadge.textContent = `入力項目: ${this.flowsData.baseQuestions.length}`;
      badgesDiv.appendChild(inputBadge);

      const docBadge = document.createElement('span');
      docBadge.className = 'badge document-count';
      docBadge.textContent = `提出書類: ${docCount || this.getAllDocuments().length}`;
      badgesDiv.appendChild(docBadge);
    } else if (mode === 'smart') {
      const docBadge = document.createElement('span');
      docBadge.className = 'badge document-count';
      docBadge.textContent = `提出書類: ${docCount}`;
      badgesDiv.appendChild(docBadge);

      if (warningCount > 0) {
        const warningBadge = document.createElement('span');
        warningBadge.className = 'badge warning-count';
        warningBadge.textContent = `要判断: ${warningCount}`;
        badgesDiv.appendChild(warningBadge);
      }
    } else if (mode === 'ai') {
      const minBadge = document.createElement('span');
      minBadge.className = 'badge document-count';
      minBadge.textContent = `最小セット: ${docCount}`;
      badgesDiv.appendChild(minBadge);
    }

    container.appendChild(badgesDiv);
  }

  createDocumentItem(doc, mode) {
    const item = document.createElement('div');
    item.className = 'document-item fade-in';

    // ヘッダー
    const header = document.createElement('div');
    header.className = 'doc-header';

    const name = document.createElement('div');
    name.className = 'doc-name';
    name.textContent = doc.name;

    // ラベル
    const label = document.createElement('span');
    label.className = 'doc-label';
    if (mode === 'smart') {
      label.className += ' required-judgment';
      label.textContent = '要判断';
    } else if (mode === 'ai') {
      label.className += ' auto-selected';
      label.textContent = 'AI選定';
    }

    header.appendChild(name);
    if (label.textContent) {
      header.appendChild(label);
    }
    item.appendChild(header);

    // 説明
    const desc = document.createElement('div');
    desc.className = 'doc-desc';
    desc.textContent = doc.description;
    item.appendChild(desc);

    // トグル機能
    const toggle = document.createElement('div');
    toggle.className = 'doc-toggle';

    const btn = document.createElement('button');
    btn.className = 'doc-toggle-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '詳細を見る';
    btn.onclick = (e) => this.toggleDetails(e, item);

    toggle.appendChild(btn);
    item.appendChild(toggle);

    // 詳細（アコーディオン）
    const details = document.createElement('div');
    details.className = 'doc-details';
    details.setAttribute('aria-hidden', 'true');

    if (doc.purpose) {
      const section1 = document.createElement('div');
      section1.className = 'detail-section';
      const title1 = document.createElement('div');
      title1.className = 'detail-section-title';
      title1.textContent = '目的';
      const content1 = document.createElement('div');
      content1.className = 'detail-section-content';
      content1.textContent = doc.purpose;
      section1.appendChild(title1);
      section1.appendChild(content1);
      details.appendChild(section1);
    }

    if (doc.fields && doc.fields.length > 0) {
      const section2 = document.createElement('div');
      section2.className = 'detail-section';
      const title2 = document.createElement('div');
      title2.className = 'detail-section-title';
      title2.textContent = '主な項目';
      const fieldsDiv = document.createElement('div');
      fieldsDiv.className = 'detail-fields';
      doc.fields.forEach(field => {
        const fieldTag = document.createElement('span');
        fieldTag.className = 'detail-field';
        fieldTag.textContent = field;
        fieldsDiv.appendChild(fieldTag);
      });
      section2.appendChild(title2);
      section2.appendChild(fieldsDiv);
      details.appendChild(section2);
    }

    if (doc.whenNeeded) {
      const section3 = document.createElement('div');
      section3.className = 'detail-section';
      const title3 = document.createElement('div');
      title3.className = 'detail-section-title';
      title3.textContent = 'いつ必要か';
      const content3 = document.createElement('div');
      content3.className = 'detail-section-content';
      content3.textContent = doc.whenNeeded;
      section3.appendChild(title3);
      section3.appendChild(content3);
      details.appendChild(section3);
    }

    if (mode === 'ai' && doc.aiReason) {
      const aiSection = document.createElement('div');
      aiSection.className = 'ai-reason';
      aiSection.textContent = `💡 ${doc.aiReason}`;
      details.appendChild(aiSection);
    }

    item.appendChild(details);

    return item;
  }

  toggleDetails(e, item) {
    const button = e.target;
    const details = item.querySelector('.doc-details');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    button.setAttribute('aria-expanded', !isExpanded);
    details.setAttribute('aria-hidden', isExpanded);
  }

  generateNecessaryDocuments() {
    const docs = [...this.flowsData.documents.base];

    if (this.checklist.surgery) {
      docs.push(...this.flowsData.documents.surgery);
    }

    if (this.checklist.hce) {
      docs.push(...this.flowsData.documents.hce);
    }

    if (this.checklist.claim) {
      docs.push(...this.flowsData.documents.claim);
    }

    if (this.checklist.proxy) {
      docs.push(...this.flowsData.documents.proxy);
    }

    if (this.checklist.expensive) {
      docs.push(...this.flowsData.documents.expensive);
    }

    if (this.checklist.transfer) {
      docs.push(...this.flowsData.documents.transfer);
    }

    return docs;
  }

  getAllDocuments() {
    const docs = [
      ...this.flowsData.documents.base,
      ...this.flowsData.documents.surgery,
      ...this.flowsData.documents.hce,
      ...this.flowsData.documents.claim,
      ...this.flowsData.documents.proxy,
      ...this.flowsData.documents.expensive,
      ...this.flowsData.documents.transfer
    ];
    return docs;
  }

  updateStats(count, maxDocs) {
    const statsPanel = document.getElementById('docStats');
    statsPanel.innerHTML = `<p>📊 必要書類: <strong>${count}</strong> 件 / 全体: ${maxDocs} 件</p>`;
  }
}

// ユーティリティ関数
async function fadeIn(element, duration) {
  element.style.opacity = '0';
  element.style.display = 'block';
  element.offsetHeight;

  element.style.transition = `opacity ${duration}ms ease-in`;
  element.style.opacity = '1';

  return new Promise(resolve => setTimeout(resolve, duration));
}

// ページロード時にアプリを初期化
document.addEventListener('DOMContentLoaded', () => {
  new HospitalizationDXApp();
});
