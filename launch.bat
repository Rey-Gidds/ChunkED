@echo off
setlocal
python --version >nul 2>&1
if %errorlevel% neq 0 (
  echo Error: Python is not installed or not in PATH.
  pause
  exit /b 1
)

echo ========================================
echo   ChunkED is starting...
echo ========================================
echo.
echo Open http://localhost:7734 in your browser.
echo.
python agent/main.py
