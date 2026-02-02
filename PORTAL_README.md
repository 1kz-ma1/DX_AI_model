# 多分野対応DX×AIポータル システム

## 概要
複数分野（医療・行政・物流・災害対応等）のDX/AI化デモを統合したポータルシステムです。

## システム構成

### 1. フロー
```
初回訪問
  ↓
intro.html (プロファイル収集)
  ↓
home.html (分野ハブ)
  ↓
domain.html?d={分野ID} (各分野の体験)
  ↓
summary.html (まとめページ) ※医療分野のみ現在対応
```

### 2. ファイル構造
```
hospitalization-dx-ai-app/
├── intro.html              # プロファイル収集ページ
├── home.html               # 分野ハブページ
├── domain.html             # 汎用分野テンプレート
├── summary.html            # まとめページ（医療用）
├── index.html              # 旧医療デモ（後方互換）
├── assets/
│   ├── css/
│   │   ├── base.css        # デザインシステム
│   │   ├── home.css        # ハブページ用
│   │   ├── domain.css      # 分野ページ用
│   │   └── summary.css     # まとめページ用
│   ├── js/
│   │   ├── state.js        # 状態管理（localStorage + URLパラメータ）
│   │   ├── router.js       # ルーティング補助
│   │   ├── intro.js        # プロファイル収集ロジック
│   │   ├── home.js         # ハブ描画ロジック
│   │   ├── domain.js       # 分野体験コアロジック
│   │   ├── viz.js          # 可視化コンポーネント
│   │   ├── app.js          # 旧医療デモロジック（後方互換）
│   │   └── summary.js      # まとめページロジック
│   └── data/
│       ├── domains.json    # 統合分野定義
│       └── flows.json      # 旧医療データ（後方互換）
```

### 3. データスキーマ (domains.json)

```json
{
  "meta": {
    "version": "1.0.0",
    "defaultMode": "plain"
  },
  "domains": [
    {
      "id": "medical",
      "name": "医療DX",
      "emoji": "🏥",
      "intro": "短い説明",
      "description": "詳細説明",
      "checklist": [
        {"id": "surgery", "label": "手術を受けた", "key": "surgery"}
      ],
      "documents": {
        "base": [
          {
            "id": "discharge_certificate",
            "name": "退院証明書",
            "inputFields": [
              {
                "id": "patient_name",
                "label": "患者氏名",
                "source": "shared",
                "requiredIf": null
              }
            ]
          }
        ]
      },
      "aiFlow": {
        "questions": [
          {
            "id": "anesthesia_type",
            "text": "手術時の麻酔はどちらを選択しますか？",
            "options": [
              {"value": "general", "label": "全身麻酔"}
            ]
          }
        ]
      },
      "modes": {
        "plain": {"title": "①電子化", "description": "説明"},
        "smart": {"title": "②工夫", "description": "説明"},
        "ai": {"title": "③AI導入", "description": "説明"}
      }
    }
  ]
}
```

#### inputFields の source 属性
- `user`: ユーザーが手入力（全モード）
- `shared`: 共有項目（Smart/AIで自動化、onlineフラグ必要）
- `mynumber`: マイナンバー連携項目（AIモード、mynaフラグ必要）
- `ai`: AI補完項目（AIモードのみ）
- `derived`: 派生項目（Smart/AIで自動計算）

#### requiredIf 条件
- `null`: 常に必須
- `"surgery"`: checklistのsurgeryがtrueの時のみ必須
- チェックリストIDを指定することで動的表示制御

### 4. 状態管理（state.js）

#### プロファイル管理
```javascript
// 保存
saveProfile({ myna: true, online: true, consent_unify: true, persona: "single" });

// 読み込み
const profile = loadProfile();

// クリア
clearProfile();
```

#### URLパラメータ管理
```javascript
// 取得（URL優先、次にlocalStorage、最後にデフォルト）
const params = mergeWithProfile();

// 設定
setParams({ d: "medical", mode: "ai" }, true); // 2番目の引数: replaceState

// ナビゲーション（パラメータ継承）
navigate('domain.html', { d: "medical", mode: "smart" });
```

### 5. 分野追加方法

1. **domains.jsonに追加**
```json
{
  "id": "education",
  "name": "教育DX",
  "emoji": "📚",
  "description": "学校手続きのDX化デモ",
  "checklist": [...],
  "documents": {...},
  "aiFlow": {...},
  "modes": {...}
}
```

2. **home.jsで自動認識**
   - domains.jsonに追加するだけで自動的にハブに表示されます

3. **domain.htmlで自動レンダリング**
   - テンプレートが統一されているため、追加実装不要

### 6. モード別削減ロジック

#### Plain（①電子化）
- すべて手入力

#### Smart（②工夫）
- `source: "shared"` + `profile.online === true` → 自動化
- `source: "derived"` → 自動計算

#### AI（③AI導入）
- Smart の機能 +
- `source: "mynumber"` + `profile.myna === true` → 自動化
- `source: "ai"` → AI補完

### 7. レスポンシブデザイン

#### デスクトップ（>768px）
- home.html: 円形リングレイアウト
- domain.html: 3カラム（チェックリスト | 書類カード | 可視化）

#### モバイル（≤768px）
- home.html: 2カラムグリッド
- domain.html: 縦1カラム（折りたたみセクション）

### 8. アクセシビリティ

- セマンティックHTML（`<main>`, `<nav>`, `<section>`）
- ARIA属性（`role`, `aria-label`, `aria-selected`）
- キーボードナビゲーション対応
- モバイルタッチターゲット ≥44px

### 9. 技術スタック

- **フロントエンド**: Vanilla JavaScript ES6
- **スタイル**: CSS3（CSS Custom Properties）
- **可視化**: SVG（ライブラリ不使用）
- **ストレージ**: localStorage
- **ルーティング**: URLパラメータ + History API

### 10. ブラウザ対応

- Chrome/Edge (推奨)
- Firefox
- Safari
- モバイルブラウザ

### 11. 開発ガイド

#### ローカル実行
```bash
# シンプルなHTTPサーバーで起動
python -m http.server 8000
# または
npx http-server -p 8000

# ブラウザでアクセス
http://localhost:8000/intro.html
```

#### デバッグ
- `localStorage`の内容確認: DevTools > Application > Local Storage
- URLパラメータ確認: URL末尾を確認
- プロファイルリセット: `clearProfile()`を実行

#### 新分野追加チェックリスト
- [ ] domains.jsonに分野定義追加
- [ ] checklist項目定義
- [ ] documents.base配列に書類定義
- [ ] inputFields配列に入力項目定義（source属性必須）
- [ ] requiredIf条件設定（動的表示制御）
- [ ] aiFlow.questions定義（AIモード時のみ）
- [ ] modes定義（plain/smart/ai）
- [ ] home.htmlでテスト（ハブに表示されるか）
- [ ] domain.html?d={id}でテスト（体験できるか）

### 12. 既存システムとの互換性

#### index.html（旧医療デモ）
- 引き続き動作します
- `flows.json`を参照
- `app.js`を使用

#### 移行パス
1. `intro.html`から開始するとプロファイル収集
2. `home.html`で分野選択
3. `domain.html?d=medical`で新医療体験
4. 旧`index.html`は直接アクセス可能（後方互換）

### 13. ロードマップ

- [x] Phase 1: プロファイル収集（intro.html）
- [x] Phase 2: 分野ハブ（home.html）
- [x] Phase 3: 汎用テンプレート（domain.html）
- [x] Phase 4: 医療データ移行（domains.json）
- [x] Phase 5: 状態管理（state.js）
- [x] Phase 6: 可視化（viz.js）
- [ ] Phase 7: 他分野追加（教育・物流・災害対応）
- [ ] Phase 8: 詳細まとめページ汎用化
- [ ] Phase 9: アニメーション強化
- [ ] Phase 10: PWA対応

---

**作成日**: 2026-02-02  
**バージョン**: v1.0.0  
**リポジトリ**: 1kz-ma1/DX_AI_model
