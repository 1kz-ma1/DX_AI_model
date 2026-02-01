/**
 * 入院手続き DX × AI 体験アプリ
 * メインアプリケーション
 */

class HospitalizationDXApp {
  constructor() {
    this.flowsData = null;
    this.currentMode = 'plain'; // plain, smart, ai
    this.currentStep = 'intro'; // intro, step1, step2
    this.formData = {};
    this.checklist = {
      surgery: false,
      hce: false,
      claim: false
    };
    this.init();
  }

  /**
   * 初期化処理
   */
  async init() {
    try {
      // flows.json を読み込み
      const response = await fetch('assets/data/flows.json');
      this.flowsData = await response.json();

      // 導入画面のイベントをセット
      this.setupIntroScreen();

      // UIの初期化
      this.initializeUI();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to load flows.json:', error);
    }
  }

  /**
   * 導入画面のセットアップ
   */
  setupIntroScreen() {
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
      this.transitionToStep1();
    });
  }

  /**
   * 導入画面からステップ1への遷移
   */
  async transitionToStep1() {
    const introScreen = document.getElementById('introScreen');
    const step1 = document.getElementById('step1');

    // 導入画面をフェードアウト
    introScreen.style.transition = 'opacity 0.4s ease-out';
    introScreen.style.opacity = '0';

    await new Promise(resolve => setTimeout(resolve, 400));

    // 導入画面を非表示、ステップ1を表示
    introScreen.style.display = 'none';
    step1.style.display = 'block';
    this.currentStep = 'step1';

    // ステップ1をフェードイン
    step1.style.opacity = '0';
    step1.offsetHeight; // reflow
    step1.style.transition = 'opacity 0.4s ease-in';
    step1.style.opacity = '1';
  }

  /**
   * ステップ1からステップ2への遷移
   */
  async transitionToStep2() {
    // フォームバリデーション
    if (!this.validateForm()) {
      alert('必須項目を入力してください。');
      return;
    }

    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');

    // ステップ1をフェードアウト
    step1.style.transition = 'opacity 0.4s ease-out';
    step1.style.opacity = '0';

    await new Promise(resolve => setTimeout(resolve, 400));

    // ステップ1を非表示、ステップ2を表示
    step1.style.display = 'none';
    step2.style.display = 'block';
    this.currentStep = 'step2';

    // ステップ2をフェードイン
    step2.style.opacity = '0';
    step2.offsetHeight; // reflow
    step2.style.transition = 'opacity 0.4s ease-in';
    step2.style.opacity = '1';

    // 初期表示
    this.renderMode(this.currentMode);
  }

  /**
   * ステップ2からステップ1への遷移（戻る）
   */
  async transitionBackToStep1() {
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');

    // ステップ2をフェードアウト
    step2.style.transition = 'opacity 0.4s ease-out';
    step2.style.opacity = '0';

    await new Promise(resolve => setTimeout(resolve, 400));

    // ステップ2を非表示、ステップ1を表示
    step2.style.display = 'none';
    step1.style.display = 'block';
    this.currentStep = 'step1';

    // ステップ1をフェードイン
    step1.style.opacity = '0';
    step1.offsetHeight; // reflow
    step1.style.transition = 'opacity 0.4s ease-in';
    step1.style.opacity = '1';
  }

  /**
   * UI要素の初期化
   */
  initializeUI() {
    // フォーム要素の動的生成
    this.generateBaseForm();
    
    // チェックリストの生成
    this.generateChecklist();

    // 初期表示（Plain）
    this.renderMode('plain');
  }

  /**
   * 基本入力フォームを動的生成
   */
  generateBaseForm() {
    const form = document.getElementById('baseForm');
    form.innerHTML = '';

    this.flowsData.baseQuestions.forEach(question => {
      const group = document.createElement('div');
      group.className = 'form-group';

      const label = document.createElement('label');
      label.htmlFor = question.id;
      label.textContent = question.label;
      if (question.required) {
        label.textContent += ' *';
      }

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

  /**
   * チェックリストを動的生成
   */
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
        // チェックリスト変更時に画面再描画（Smart/AI）
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

  /**
   * イベントリスナーの設定
   */
  attachEventListeners() {
    // DXモード切り替えボタン
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.switchMode(mode);
      });
    });

    // ステップ1 → ステップ2 ボタン
    document.getElementById('nextToStep2Btn').addEventListener('click', () => {
      this.transitionToStep2();
    });

    // ステップ2 → ステップ1（戻る）ボタン
    document.getElementById('backToStep1Btn').addEventListener('click', () => {
      this.transitionBackToStep1();
    });
  }

  /**
   * フォームバリデーション
   */
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

  /**
   * DXモード切り替え
   */
  switchMode(mode) {
    this.currentMode = mode;

    // ボタンの状態更新
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      }
    });

    // 画面を再描画
    this.renderMode(mode);
  }

  /**
   * モード別の描画
   */
  renderMode(mode) {
    const modeInfo = this.flowsData.modes[mode];
    document.getElementById('modeTitle').textContent = modeInfo.title;
    document.getElementById('modeDesc').textContent = modeInfo.description;

    // 全ての結果パネルを非表示
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

  /**
   * Plain モード：全書類を表示
   */
  renderPlainMode() {
    const panel = document.getElementById('plainResult');
    panel.style.display = 'block';

    const container = document.getElementById('plainDocuments');
    container.innerHTML = '';

    // 全ての書類を表示
    this.getAllDocuments().forEach(doc => {
      const item = this.createDocumentItem(doc);
      container.appendChild(item);
    });

    this.updateStats(this.getAllDocuments().length);
  }

  /**
   * Smart モード：条件別に書類を表示 + 限界を表示
   */
  renderSmartMode() {
    const panel = document.getElementById('smartResult');
    panel.style.display = 'block';

    const container = document.getElementById('smartDocuments');
    container.innerHTML = '';

    // 基本書類
    const docs = [...this.flowsData.documents.common];

    // チェックリスト項目に基づく書類追加
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

    // 書類表示
    docs.forEach(doc => {
      const item = this.createDocumentItem(doc);
      container.appendChild(item);
    });

    // 警告表示
    const warningList = document.getElementById('smartWarnings');
    warningList.innerHTML = '';
    warnings.forEach(warning => {
      const li = document.createElement('li');
      li.textContent = warning;
      warningList.appendChild(li);
    });

    this.updateStats(docs.length);
  }

  /**
   * AI モード：対話 + 最小書類生成
   */
  async renderAIMode() {
    const panel = document.getElementById('aiResult');
    const dialogPanel = document.getElementById('aiDialogPanel');
    const docsPanel = document.getElementById('aiDocumentsPanel');
    
    panel.style.display = 'block';
    dialogPanel.style.display = 'none';
    docsPanel.style.display = 'none';

    // 対話パネルを表示
    await fadeIn(dialogPanel, 300);

    // Typing アニメーション
    const typingElement = document.getElementById('aiTypingText');
    const typing = new TypingAnimation(typingElement, 40);

    // AI対話シミュレーション
    let aiResponse = '状況を整理しています...\n\n';

    // 各質問に対する回答を整理
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

    aiResponse += '\n必要な書類を最小限に整理しました...';

    // Typing アニメーション実行
    await typing.type(aiResponse);

    // 書類パネルを表示
    await new Promise(resolve => setTimeout(resolve, 500));
    await fadeIn(docsPanel, 300);

    // 必要な書類を生成
    const necessaryDocs = this.generateNecessaryDocuments();
    const container = document.getElementById('aiDocuments');
    container.innerHTML = '';

    necessaryDocs.forEach(doc => {
      const item = this.createDocumentItem(doc);
      container.appendChild(item);
    });

    this.updateStats(necessaryDocs.length);
  }

  /**
   * 必要な書類を生成（AI版）
   */
  generateNecessaryDocuments() {
    const docs = [...this.flowsData.documents.common];

    if (this.checklist.surgery) {
      docs.push(...this.flowsData.documents.surgery);
    }

    if (this.checklist.hce) {
      docs.push(...this.flowsData.documents.hce);
    }

    if (this.checklist.claim) {
      docs.push(...this.flowsData.documents.claim);
    }

    return docs;
  }

  /**
   * 全書類を取得
   */
  getAllDocuments() {
    const docs = [
      ...this.flowsData.documents.common,
      ...this.flowsData.documents.surgery,
      ...this.flowsData.documents.hce,
      ...this.flowsData.documents.claim
    ];
    return docs;
  }

  /**
   * 書類アイテムを作成
   */
  createDocumentItem(doc) {
    const item = document.createElement('div');
    item.className = 'document-item';
    item.dataset.docId = doc.id;

    const name = document.createElement('div');
    name.className = 'doc-name';
    name.textContent = doc.name;

    const desc = document.createElement('div');
    desc.className = 'doc-desc';
    desc.textContent = doc.description;

    item.appendChild(name);
    item.appendChild(desc);
    return item;
  }

  /**
   * 統計情報を更新
   */
  updateStats(count) {
    const maxDocs = this.getAllDocuments().length;
    const statsPanel = document.getElementById('docStats');
    statsPanel.innerHTML = `<p>📊 必要書類: <strong>${count}</strong> 件 / 全体: ${maxDocs} 件</p>`;
  }
}

// ページロード時にアプリを初期化
document.addEventListener('DOMContentLoaded', () => {
  new HospitalizationDXApp();
});
