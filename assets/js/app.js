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
    // デフォルト値の定義
    this.defaultFormData = {
      name: '山田太郎',
      age: '45',
      purpose: '手術のため',
      duration: '7',
      patientId: '123456',
      phone: '090-1234-5678',
      address: '東京都渋谷区1-2-3',
      emergency: '090-9876-5432'
    };
    this.init();
  }

  async init() {
    this.setLoading(true);
    this.bindReloadHandler();
    try {
      this.flowsData = await this.loadFlows();
      this.setupIntroScreen();
      this.initializeUI();
      this.attachEventListeners();
      this.restoreStateFromStorage();
      this.restoreStateFromUrl();
      this.setLoading(false);
    } catch (error) {
      console.error('Failed to load flows.json:', error);
      this.flowsData = this.getFallbackFlows();
      this.showLoadError(true);
      this.initializeUI();
      this.attachEventListeners();
      this.restoreStateFromStorage();
      this.restoreStateFromUrl();
      this.setLoading(false);
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

  async transitionToStep2(skipValidation = false) {
    if (!skipValidation && !this.validateForm()) {
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
    this.setActiveMobileTab('checklist');
    this.showMobileSection('checklist');
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
    this.initMobileTabs();
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
        this.renderMode(this.currentMode);
        this.persistState();
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

    // スキップボタンのイベントリスナー
    const skipBtn = document.getElementById('skipInputBtn');
    skipBtn.addEventListener('click', () => this.showPreviewModal());

    // プレビューモーダルのイベントリスナー
    const confirmBtn = document.getElementById('confirmSkipBtn');
    confirmBtn.addEventListener('click', () => this.confirmSkip());

    const cancelBtn = document.getElementById('cancelSkipBtn');
    cancelBtn.addEventListener('click', () => this.closePreviewModal());
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
      btn.setAttribute('aria-pressed', 'false');
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }
    });

    this.renderMode(mode);
    this.persistState();
  }

  renderMode(mode) {
    const modeInfo = this.flowsData.modes[mode];
    document.getElementById('modeTitle').textContent = modeInfo.title;
    document.getElementById('modeDesc').textContent = modeInfo.description;

    this.syncModeButtons();

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

    this.updateMetrics();
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

    const { baseDocs, conditionalDocs, warnings } = this.getSmartDocumentsAndWarnings();
    const allDocs = [...baseDocs, ...conditionalDocs];

    this.displayModeBadges('smart', container, allDocs.length, warnings.length);

    baseDocs.forEach(doc => {
      const item = this.createDocumentItem(doc, 'smart', 'auto');
      container.appendChild(item);
    });

    conditionalDocs.forEach(doc => {
      const item = this.createDocumentItem(doc, 'smart', 'warning');
      container.appendChild(item);
    });

    const warningList = document.getElementById('smartWarnings');
    warningList.innerHTML = '';
    warnings.forEach(warning => {
      const li = document.createElement('li');
      li.textContent = warning;
      warningList.appendChild(li);
    });

    this.updateStats(allDocs.length, this.getAllDocuments().length);
  }

  async renderAIMode() {
    const panel = document.getElementById('aiResult');
    const dialogPanel = document.getElementById('aiDialogPanel');
    const docsPanel = document.getElementById('aiDocumentsPanel');
    const judgmentLog = document.getElementById('aiJudgmentLog');

    panel.style.display = 'block';
    dialogPanel.style.display = 'none';
    docsPanel.style.display = 'none';

    await fadeIn(dialogPanel, 300);

    const typingElement = document.getElementById('aiTypingText');
    const typing = new TypingAnimation(typingElement, 40);
    const logTyping = new TypingAnimation(judgmentLog, 18);

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

    const logLines = this.buildAiJudgmentLines();
    judgmentLog.textContent = '';
    await logTyping.type(logLines.join('\n'));
    await typing.type(aiResponse);

    await new Promise(resolve => setTimeout(resolve, 500));
    await fadeIn(docsPanel, 300);

    const necessaryDocs = this.getAiDocuments();
    const container = document.getElementById('aiDocuments');
    container.innerHTML = '';
    this.displayModeBadges('ai', container, necessaryDocs.length);

    const minCounter = document.getElementById('aiMinCount');
    if (minCounter) {
      await this.animateCounter(minCounter, this.getAllDocuments().length, necessaryDocs.length);
    }

    necessaryDocs.forEach(doc => {
      const item = this.createDocumentItem(doc, 'ai', 'ai');
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
      minBadge.innerHTML = `最小セット: <span id="aiMinCount" class="counter-display">${docCount}</span>`;
      badgesDiv.appendChild(minBadge);
    }

    container.appendChild(badgesDiv);
  }

  createDocumentItem(doc, mode, labelType) {
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
    if (labelType === 'auto') {
      label.className += ' auto-input';
      label.textContent = '共通項目 自動入力';
    } else if (labelType === 'warning') {
      label.className += ' required-judgment';
      label.textContent = '要判断';
    } else if (labelType === 'ai') {
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
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '詳細を見る';
    const detailsId = `doc-details-${doc.id}`;
    btn.setAttribute('aria-controls', detailsId);
    btn.onclick = (e) => this.toggleDetails(e, item);

    toggle.appendChild(btn);
    item.appendChild(toggle);

    // 詳細（アコーディオン）
    const details = document.createElement('div');
    details.className = 'doc-details';
    details.setAttribute('aria-hidden', 'true');
    details.id = detailsId;

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

  getAiDocuments() {
    return this.generateNecessaryDocuments();
  }

  getSmartDocumentsAndWarnings() {
    const baseDocs = [...this.flowsData.documents.base];
    const conditionalDocs = [];
    const warnings = [];

    if (this.checklist.surgery) {
      conditionalDocs.push(...this.flowsData.documents.surgery);
    } else {
      warnings.push('手術を受けたか：チェックで判定');
    }

    if (this.checklist.hce) {
      conditionalDocs.push(...this.flowsData.documents.hce);
    } else {
      warnings.push('高額療養費：チェックで判定');
    }

    if (this.checklist.claim) {
      conditionalDocs.push(...this.flowsData.documents.claim);
    } else {
      warnings.push('医療保険請求：チェックで判定');
    }

    if (this.checklist.proxy) {
      conditionalDocs.push(...this.flowsData.documents.proxy);
    } else {
      warnings.push('代理人による手続き：チェックで判定');
    }

    if (this.checklist.expensive) {
      conditionalDocs.push(...this.flowsData.documents.expensive);
    } else {
      warnings.push('高額医療費申請：チェックで判定');
    }

    if (this.checklist.transfer) {
      conditionalDocs.push(...this.flowsData.documents.transfer);
    } else {
      warnings.push('転院の予定：チェックで判定');
    }

    return { baseDocs, conditionalDocs, warnings };
  }

  buildAiJudgmentLines() {
    const lines = [];

    if (this.checklist.surgery) {
      lines.push('手術あり → 手術同意書・麻酔同意書を追加');
    }

    if (this.checklist.hce) {
      lines.push('高額療養費申請 → 申請書類を追加');
    }

    if (this.checklist.claim) {
      lines.push('保険請求あり → 診断書を追加');
    }

    if (this.checklist.proxy) {
      lines.push('代理人あり → 委任状を追加');
    }

    if (this.checklist.expensive) {
      lines.push('高額医療費 → 事前申請書を追加');
    }

    if (this.checklist.transfer) {
      lines.push('転院あり → 紹介状を追加');
    }

    if (lines.length === 0) {
      lines.push('該当条件なし → 基本書類のみ');
    }

    return lines.slice(0, 3);
  }

  updateMetrics() {
    const plainCount = this.getAllDocuments().length;
    const { conditionalDocs, warnings } = this.getSmartDocumentsAndWarnings();
    const smartCount = this.flowsData.documents.base.length + conditionalDocs.length;
    const aiCount = this.getAiDocuments().length;
    const inputCount = this.flowsData.baseQuestions.length;
    const smartInput = Math.max(3, Math.round(inputCount * 0.6));
    const aiInput = Math.max(2, Math.round(inputCount * 0.3));
    const maxWarn = Math.max(1, warnings.length);

    this.updateMetricRow('Docs', plainCount, smartCount, aiCount, plainCount);
    this.updateMetricRow('Input', inputCount, smartInput, aiInput, inputCount);
    this.updateMetricRow('Warn', 0, warnings.length, 0, maxWarn);
  }

  updateMetricRow(prefix, plainValue, smartValue, aiValue, maxValue) {
    const plainBar = document.getElementById(`metric${prefix}Plain`);
    const smartBar = document.getElementById(`metric${prefix}Smart`);
    const aiBar = document.getElementById(`metric${prefix}Ai`);
    const plainText = document.getElementById(`metric${prefix}PlainValue`);
    const smartText = document.getElementById(`metric${prefix}SmartValue`);
    const aiText = document.getElementById(`metric${prefix}AiValue`);

    if (!plainBar || !smartBar || !aiBar) {
      return;
    }

    const max = Math.max(1, maxValue);
    plainBar.style.width = `${Math.max(8, Math.round((plainValue / max) * 100))}%`;
    smartBar.style.width = `${Math.max(8, Math.round((smartValue / max) * 100))}%`;
    aiBar.style.width = `${Math.max(8, Math.round((aiValue / max) * 100))}%`;

    if (plainText) plainText.textContent = plainValue;
    if (smartText) smartText.textContent = smartValue;
    if (aiText) aiText.textContent = aiValue;
  }

  async animateCounter(element, from, to) {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const isDecreasing = from > to;
    const steps = Math.max(4, Math.min(12, Math.abs(from - to)));
    const stepValue = Math.max(1, Math.round((end - start) / steps));
    let current = from;

    for (let i = 0; i <= steps; i += 1) {
      element.textContent = current;
      element.classList.add('pulse');
      await new Promise(resolve => setTimeout(resolve, 80));
      element.classList.remove('pulse');
      current = isDecreasing ? Math.max(to, current - stepValue) : Math.min(to, current + stepValue);
    }

    element.textContent = to;
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

  initMobileTabs() {
    const tabs = document.querySelectorAll('.mobile-tab');
    if (!tabs.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const action = tab.dataset.action;
        const target = tab.dataset.target;

        this.setActiveMobileTab(tab.dataset.target || tab.dataset.action);

        if (action === 'go-input') {
          this.transitionBackToStep1();
          return;
        }

        this.showMobileSection(target);
      });
    });
  }

  setActiveMobileTab(target) {
    const tabs = document.querySelectorAll('.mobile-tab');
    if (!tabs.length) return;

    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });

    const tab = Array.from(tabs).find(t => t.dataset.target === target || t.dataset.action === target);
    if (tab) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    }
  }

  showMobileSection(target) {
    const checklist = document.getElementById('checklistSection');
    const result = document.getElementById('resultSection');
    if (!checklist || !result) return;

    checklist.classList.remove('mobile-visible');
    result.classList.remove('mobile-visible');

    if (target === 'checklist') {
      checklist.classList.add('mobile-visible');
    } else if (target === 'result') {
      result.classList.add('mobile-visible');
    }
  }

  syncModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      const isActive = btn.dataset.mode === this.currentMode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  async loadFlows() {
    const response = await fetch('assets/data/flows.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  setLoading(isLoading) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return;
    loadingScreen.style.display = isLoading ? 'flex' : 'none';
  }

  showLoadError(isVisible) {
    const errorPanel = document.getElementById('loadError');
    if (!errorPanel) return;
    errorPanel.style.display = isVisible ? 'flex' : 'none';
  }

  bindReloadHandler() {
    const reloadBtn = document.getElementById('reloadBtn');
    if (!reloadBtn) return;
    reloadBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  getFallbackFlows() {
    return {
      baseQuestions: [
        { id: 'name', label: '氏名', type: 'text', required: true, placeholder: '山田太郎' },
        { id: 'insurance', label: '保険証の種類', type: 'select', required: true, options: [
          { value: 'kokumin', label: '国保（国民健康保険）' },
          { value: 'shahou', label: '社保（社会保険）' }
        ] }
      ],
      checklist: [
        { id: 'surgery', label: '手術を受けた', key: 'surgery' },
        { id: 'hce', label: '高額療養費制度を申請する', key: 'hce' }
      ],
      documents: {
        base: [
          { id: 'discharge_certificate', name: '退院証明書', description: '入院期間を証明する書類' }
        ],
        surgery: [
          { id: 'surgery_consent', name: '手術同意書', description: '手術実施に対する同意書' }
        ],
        hce: [
          { id: 'hce_application', name: '限度額認定証の申請書', description: '高額療養費制度の申請用紙' }
        ],
        claim: [],
        proxy: [],
        expensive: [],
        transfer: []
      },
      aiFlow: [],
      modes: {
        plain: { title: '電子化（Plain）', description: '紙をそのままWebフォームに置き換えた状態' },
        smart: { title: '工夫した電子化（Smart）', description: '条件に応じた自動化により効率化' },
        ai: { title: 'AI導入（AI）', description: '最小限の入力で状況を自動整理' }
      }
    };
  }

  persistState() {
    const state = {
      mode: this.currentMode,
      checklist: this.checklist
    };
    localStorage.setItem('dxai_state', JSON.stringify(state));
    this.updateUrlParams();
  }

  restoreStateFromStorage() {
    try {
      const raw = localStorage.getItem('dxai_state');
      if (!raw) return;
      const state = JSON.parse(raw);
      if (state?.checklist) {
        this.checklist = { ...this.checklist, ...state.checklist };
      }
      if (state?.mode) {
        this.currentMode = state.mode;
      }
      this.syncChecklistUI();
      this.switchMode(this.currentMode);
    } catch (error) {
      console.warn('Failed to restore state from storage:', error);
    }
  }

  restoreStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode) {
      this.currentMode = mode;
    }

    Object.keys(this.checklist).forEach(key => {
      const value = params.get(key);
      if (value === '1' || value === '0') {
        this.checklist[key] = value === '1';
      }
    });

    this.syncChecklistUI();
    this.switchMode(this.currentMode);
  }

  updateUrlParams() {
    const params = new URLSearchParams();
    params.set('mode', this.currentMode);
    Object.entries(this.checklist).forEach(([key, value]) => {
      params.set(key, value ? '1' : '0');
    });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  syncChecklistUI() {
    Object.keys(this.checklist).forEach(key => {
      const input = document.getElementById(key);
      if (input) {
        input.checked = this.checklist[key];
      }
    });
  }

  // デフォルト値でフォームを自動入力
  fillFormWithDefaults() {
    Object.entries(this.defaultFormData).forEach(([key, value]) => {
      const input = document.querySelector(`#baseForm [name="${key}"]`);
      if (input) {
        input.value = value;
        this.formData[key] = value;
      }
    });
  }

  // プレビューモーダルを表示
  showPreviewModal() {
    this.fillFormWithDefaults();
    
    const previewList = document.getElementById('previewList');
    const questions = this.flowsData?.questions?.baseQuestions || [];
    
    previewList.innerHTML = questions.map(q => {
      const value = this.formData[q.id] || '';
      return `
        <div class="preview-item">
          <span class="preview-label">${q.label}</span>
          <span class="preview-value">${value}</span>
        </div>
      `;
    }).join('');
    
    const modal = document.getElementById('previewModal');
    modal.style.display = 'flex';
  }

  // プレビューモーダルを閉じる
  closePreviewModal() {
    const modal = document.getElementById('previewModal');
    modal.style.display = 'none';
  }

  // スキップを確定してステップ2へ
  confirmSkip() {
    this.closePreviewModal();
    this.transitionToStep2(true); // バリデーションをスキップ
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
