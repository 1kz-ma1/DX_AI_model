# 🏥 入院手続き DX × AI 体験アプリ

退院に向けた必要書類を整理するプロセスを、**電子化 → 工夫 → AI導入**の3段階DXで体験できるミニアプリです。

## 📌 アプリの目的

入院手続きにおける段階的な DX を体験することで、以下を実感できます：

- **①電子化（Plain）**：紙をそのままWebフォームに置き換えた状態
- **②工夫（Smart）**：共通項目の自動入力と条件分岐の自動化
- **③AI導入（AI）**：最小限の入力 + 対話による状況整理 → 自動生成

## 🎯 3段階の違い

### ① Plain（電子化）
- 入力項目が10-20個
- 共通項目も何度も再入力
- すべての書類が一覧表示（削減なし）

### ② Smart（工夫）
- 共通項目は自動入力
- チェックリスト項目で条件判定
- 一部書類は削減（手動判断が必要な項目に注記表示）

### ③ AI（AI導入）
- 一問一答の最小入力
- AI風のtyping演出で状況整理
- 不要書類がフェードアウト
- 必要書類が最小セットに縮む

## 📁 プロジェクト構成

```
hospitalization-dx-ai-app/
├── index.html                   # メインHTML（3カラムレイアウト）
├── assets/
│   ├── css/
│   │   └── style.css           # スタイル（グラデーション + アニメーション）
│   ├── js/
│   │   ├── app.js              # メインロジック（ステート管理、3モード切替）
│   │   └── typing.js           # Typing アニメーション モジュール
│   └── data/
│       └── flows.json          # データ駆動設計（全ての文言・ロジック）
└── README.md                     # このファイル
```

## 🚀 使い方

### ローカル実行
```bash
# Python 3系でシンプルサーバーを起動
python -m http.server 8000

# ブラウザで開く
# http://localhost:8000/
```

### GitHub Pages で公開
1. リポジトリを作成
2. `main` ブランチのルートにこのファイルを配置
3. GitHub Pages を有効化（Settings → Pages → Source: main branch）

## 🛠️ カスタマイズ方法

### 入力項目を追加
`assets/data/flows.json` の `baseQuestions` 配列にオブジェクトを追加：

```json
{
  "id": "新しい項目ID",
  "label": "表示ラベル",
  "type": "text",  // text, date, select など
  "required": true,
  "placeholder": "プレースホルダー"
}
```

### チェックリスト項目を追加
`assets/data/flows.json` の `checklist` 配列にオブジェクトを追加：

```json
{
  "id": "新しい項目ID",
  "label": "表示ラベル",
  "key": "checklist_key"
}
```

### 必要書類を追加
`assets/data/flows.json` の `documents` 内に配列を追加：

```json
"新しいカテゴリ": [
  {
    "id": "doc_id",
    "name": "書類名",
    "description": "説明"
  }
]
```

## 🎨 デザイン特徴

- **グラデーション**：紫→紫ピンク色のモダンなビジュアル
- **3カラムレイアウト**：入力 | チェックリスト | 結果表示
- **アニメーション**：Typing效果、フェードイン/アウト、スライドイン
- **レスポンシブ**：タブレット・スマホにも対応

## ⚙️ 技術スタック

- **フロントエンド**：HTML + CSS + Vanilla JavaScript
- **データ**：JSON（`flows.json`）
- **アニメーション**：CSS + JavaScript（外部ライブラリなし）
- **ホスティング**：GitHub Pages（推奨）

## 📊 ファイル説明

### index.html
- 3カラムレイアウト（左：入力、中央：チェックリスト、右：結果）
- Dynamic form generation
- Mode display panels（Plain / Smart / AI）

### style.css
- グリッドベースレイアウト
- グラデーション背景
- Typing風アニメーション
- フェード・スライドインエフェクト
- ダークモード対応可能

### app.js
- クラス `HospitalizationDXApp` でステート管理
- モード切り替えロジック
- フォーム動的生成
- チェックリスト連動更新
- 書類生成ロジック（Plain / Smart / AI）

### typing.js
- Typing animation クラス
- Fade in/out 関数
- Slide in 関数
- 複数要素の順序付きアニメーション

### flows.json
- `baseQuestions`：基本入力項目
- `checklist`：退院向け確認項目
- `documents`：カテゴリ別書類リスト
- `aiFlow`：一問一答シナリオ
- `modes`：各DXモードの説明文

## 🔮 今後の拡張案

1. **本物のAI連携**：Django / Flask バックエンドと連携
2. **PDF生成**：選択された書類をPDFで出力
3. **医療施設の検索**：病院別の対応書類パターン
4. **多言語対応**：英語・中国語など
5. **ユーザー登録**：入力データの保存機能

## 📝 ライセンス

MIT License - 自由に利用・改変可能

## 👨‍💼 問い合わせ

不具合報告や機能リクエストは GitHub Issues で。
