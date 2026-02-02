#!/bin/bash
# Simple HTTP Server Launcher for macOS/Linux
# DX x AI Portal System

echo "========================================"
echo "  DX x AI Portal System - Server"
echo "========================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Python3 が見つかりません。"
    echo "Python をインストールしてください: https://www.python.org/"
    exit 1
fi

echo "[INFO] Starting HTTP server on port 8000..."
echo "[INFO] ブラウザで以下にアクセスしてください:"
echo ""
echo "  http://localhost:8000/intro.html"
echo ""
echo "[INFO] サーバーを停止するには Ctrl+C を押してください"
echo ""

python3 -m http.server 8000
