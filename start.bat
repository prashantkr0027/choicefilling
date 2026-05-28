@echo off
setlocal EnableDelayedExpansion
title JoSAA Choice Filler

:: ─────────────────────────────────────────────────────────────────────────────
::  JoSAA Choice Filler — Dev Launcher
::
::  This app is a pure Vite + React frontend.
::  The Vite dev server serves both the React app AND the static HTML cutoff
::  files from public\data\, so there is no separate backend process.
::
::  What this script does:
::    1. Ensures Node.js is on PATH
::    2. Installs npm packages if node_modules is missing
::    3. Starts the Vite dev server (npm run dev)
::    4. Opens http://localhost:5173 in your default browser
:: ─────────────────────────────────────────────────────────────────────────────

:: Ensure Node.js is on PATH (added by the installer to Machine PATH)
set "NODE_DIR=C:\Program Files\nodejs"
if exist "%NODE_DIR%\node.exe" (
    set "PATH=%NODE_DIR%;%PATH%"
)

:: Verify node is available
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Node.js was not found on PATH.
    echo  Please install Node.js from https://nodejs.org and re-run this script.
    echo.
    pause
    exit /b 1
)

:: Print versions
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm --version')  do set NPM_VER=%%v
echo.
echo  Node.js  %NODE_VER%    npm  %NPM_VER%
echo.

:: Change to the project directory (wherever this .bat lives)
cd /d "%~dp0"

:: Install dependencies if node_modules is absent
if not exist "node_modules\" (
    echo  [INFO] node_modules not found — running npm install...
    echo.
    npm install
    if errorlevel 1 (
        echo.
        echo  [ERROR] npm install failed. Check the output above.
        pause
        exit /b 1
    )
    echo.
)

:: Open browser after a short delay (Vite takes ~1s to bind)
echo  [INFO] Starting Vite dev server...
echo  [INFO] App will open at http://localhost:5173
echo.
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul && start http://localhost:5173"

:: Start the dev server (foreground — close this window to stop it)
npm run dev

:: If npm run dev exits (e.g. Ctrl+C), pause so the window doesn't vanish
echo.
echo  [INFO] Dev server stopped.
pause
