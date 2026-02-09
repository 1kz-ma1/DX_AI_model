# DX-AI Model - Quick Start Guide

## 🚀 起動手順（5分で完了）

### 1. バックエンド（API サーバー）

```bash
# ターミナル1
cd backend
pip install -r requirements.txt
python app.py
```

✅ `http://localhost:5000` で起動

### 2. フロントエンド

```bash
# ターミナル2
python -m http.server 8000
```

✅ ブラウザで `http://localhost:8000/home.html` を開く

## 📦 初回セットアップ

データベースがない場合のみ実行：

```bash
cd backend
python migrate_to_db.py
```

## 🎯 動作確認

1. バックエンド: http://localhost:5000/api/health
2. フロントエンド: http://localhost:8000/home.html

---

詳細は [DATABASE_README.md](DATABASE_README.md) を参照
