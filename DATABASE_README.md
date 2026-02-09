# DX-AIモデル データベース統合

## 🎯 概要

このプロジェクトは、JSONファイルベースのデータ管理からSQLiteデータベース + REST APIアーキテクチャに移行しました。

## 🏗️ アーキテクチャ

```
┌─────────────────────┐
│   フロントエンド      │
│   (HTML/CSS/JS)     │
└──────────┬──────────┘
           │ HTTP REST API
           │
┌──────────▼──────────┐
│   Flask API Server  │
│   (Python 3.x)      │
└──────────┬──────────┘
           │ SQL
           │
┌──────────▼──────────┐
│   SQLite Database   │
│   (dx_ai_model.db)  │
└─────────────────────┘
```

## 📊 データベーススキーマ

### 主要テーブル

1. **domains** - DX分野マスタ
   - id, name, emoji, description
   - annual_maintenance_cost_smart, annual_maintenance_cost_ai

2. **demo_metrics** - デモモード統計
   - domain_id, mode (plain/smart/ai)
   - daily_documents, reduction_rate, time_reduction_rate
   - cost_reduction_percentage, implementation_cost

3. **documents** - 書類テンプレート
   - id, domain_id, name, description, category

4. **input_fields** - 入力項目
   - document_id, field_id, label, source

5. **characters** - ペルソナ
   - id, name, emoji, role, age, description

6. **character_domains** - ペルソナとDX分野の関連
   - character_id, domain_id, priority, frequency

7. **domain_dependencies** - 依存関係
   - source_domain_id, target_domain_id, dependency_rate

8. **flow_questions** - フロー質問
   - id, label, type, required

詳細は [backend/schema.sql](backend/schema.sql) を参照

## 🚀 セットアップ手順

### 1. 依存パッケージのインストール

```bash
cd backend
pip install -r requirements.txt
```

### 2. データベースの初期化

```bash
python migrate_to_db.py
```

実行結果：
- `dx_ai_model.db` が作成されます
- JSONデータから以下が移行されます:
  - 5個のドメイン
  - 15件のデモメトリクス
  - 73件の書類
  - 627件の入力項目
  - 5人のペルソナ
  - 25件のペルソナ-ドメイン関連
  - 8件のフロー質問

### 3. APIサーバーの起動

```bash
python app.py
```

サーバーが `http://localhost:5000` で起動します。

### 4. フロントエンドの起動

```bash
# プロジェクトルートで
python -m http.server 8000
```

`http://localhost:8000/home.html` にアクセスしてください。

## 📡 API エンドポイント

### ヘルスチェック
```
GET /api/health
```

### ドメイン
```
GET /api/domains              # 全ドメインを取得
GET /api/domains/<id>         # 特定ドメインを取得
GET /api/domains/<id>/documents  # ドメインの書類一覧
```

### ペルソナ
```
GET /api/characters           # 全ペルソナを取得
GET /api/characters/<id>      # 特定ペルソナを取得
```

### フロー
```
GET /api/flows/questions      # フロー質問を取得
```

### 統計
```
GET /api/statistics/summary   # 統計サマリーを取得
```

## 💡 技術的な特徴

### 1. リレーショナルDB設計
- 正規化されたテーブル構造
- 外部キー制約による整合性保証
- インデックスによる高速検索

### 2. RESTful API
- Flask + Flask-CORS
- JSON形式のレスポンス
- エラーハンドリング

### 3. フロントエンド分離
- APIクライアント (`api-client.js`)
- Fetch APIによる非同期通信
- JSONファイルからの移行が容易

### 4. パフォーマンス
- データベースクエリの最適化
- GROUP_CONCATによる複数行の集約
- レスポンスデータの効率的な構造化

### 5. スケーラビリティ
- SQLiteから PostgreSQL/MySQL への移行が容易
- ORM (SQLAlchemy) 対応可能
- マイクロサービス化の基盤

## 📁 ファイル構造

```
hospitalization-dx-ai-app/
├── backend/
│   ├── app.py              # Flask APIサーバー
│   ├── schema.sql          # データベーススキーマ
│   ├── migrate_to_db.py    # マイグレーションスクリプト
│   ├── requirements.txt    # Python依存パッケージ
│   └── dx_ai_model.db      # SQLiteデータベース
├── assets/
│   ├── js/
│   │   ├── api-client.js   # APIクライアント
│   │   └── home.js         # メインロジック
│   └── data/
│       ├── domains.json    # (レガシー)
│       ├── characters.json # (レガシー)
│       └── flows.json      # (レガシー)
└── home.html               # メインページ
```

## 🔧 開発ワークフロー

### データの追加・変更

1. JSONファイルを編集
2. マイグレーションスクリプトを実行
   ```bash
   python backend/migrate_to_db.py
   ```
3. APIサーバーを再起動

### APIのテスト

```bash
# ヘルスチェック
curl http://localhost:5000/api/health

# ドメイン一覧
curl http://localhost:5000/api/domains

# 特定ドメイン
curl http://localhost:5000/api/domains/administration
```

## 🎓 DeNA向けアピールポイント

### 1. フルスタック開発スキル
- バックエンド: Python (Flask)
- データベース: SQLite (RDB設計)
- フロントエンド: JavaScript (REST API連携)

### 2. アーキテクチャ設計
- RESTful APIの設計と実装
- データベーススキーマの正規化
- フロントエンド/バックエンド分離

### 3. スケーラビリティへの配慮
- SQLiteから商用DBへの移行を想定
- APIファーストアプローチ
- マイクロサービス化の基盤

### 4. 実装力
- 0→1のシステム構築
- データマイグレーション
- エラーハンドリング

### 5. ドキュメント作成
- 技術仕様書
- API仕様書
- セットアップ手順

## 🐛 トラブルシューティング

### APIサーバーに接続できない

1. サーバーが起動しているか確認
   ```bash
   python backend/app.py
   ```

2. ポート5000が使用中でないか確認
   ```bash
   netstat -an | findstr :5000
   ```

3. Windowsファイアウォールの設定を確認

### CORS エラーが発生する

`backend/app.py`で CORS が有効化されています：
```python
CORS(app)  # 全てのオリジンからのアクセスを許可
```

本番環境では特定のオリジンのみ許可するように変更してください：
```python
CORS(app, resources={r"/api/*": {"origins": "https://yourdomain.com"}})
```

### データベースが破損した

マイグレーションを再実行してください：
```bash
python backend/migrate_to_db.py
```

既存のデータベースは自動的に削除され、再作成されます。

## 📝 今後の拡張案

1. **認証・認可**: JWT トークンによるAPI保護
2. **キャッシュ**: Redis によるレスポンスキャッシュ
3. **ロギング**: アクセスログ・エラーログの記録
4. **テスト**: pytest によるユニットテスト
5. **本番化**: Gunicorn + Nginx でのデプロイ
6. **クラウド化**: Azure App Service / PostgreSQL へのデプロイ

## 📞 サポート

質問や問題がある場合は、リポジトリのIssueを作成してください。

---

**作成日**: 2026年2月6日  
**バージョン**: 1.0.0
