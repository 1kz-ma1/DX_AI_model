@echo off
REM Simple HTTP Server Launcher for Windows
REM DX x AI Portal System

echo ========================================
echo   DX x AI Portal System - Server
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python が見つかりません。
    echo Python をインストールしてください: https://www.python.org/
    pause
    exit /b 1
)

echo [INFO] Starting HTTP server on port 8000...
echo [INFO] ブラウザで以下にアクセスしてください:
echo.
echo   http://localhost:8000/intro.html
echo.
echo [INFO] サーバーを停止するには Ctrl+C を押してください
echo.

python -m http.server 8000
