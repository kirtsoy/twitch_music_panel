@echo off
setlocal enabledelayedexpansion
title Deploy 420 Mixtape to GitHub Pages
echo ========================================================
echo       KIRTSOY - 420 MIXTAPE - GITHUB PAGES DEPLOY
echo ========================================================
echo.

cd /d "%~dp0"

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in PATH!
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

echo [1/5] Checking Git configuration...
for /f "tokens=*" %%i in ('git config user.name') do set GIT_USER=%%i
if "%GIT_USER%"=="" (
    git config --global user.name "Kirill Tsoy"
    git config --global user.email "kirill_tsoy@sfu.ca"
    echo Configured Git user as: Kirill Tsoy
)

if not exist ".git" (
    echo [2/5] Initializing local Git repository...
    git init
    git branch -M main
) else (
    echo [2/5] Local Git repository already initialized.
)

echo.
echo [3/5] Staging files (Player, Styles, 24 Audio Tracks)...
git add .

echo.
echo [4/5] Committing changes...
git commit -m "Deploy 420 Mixtape Web Player & 24 Offline Audio Tracks"

echo.
echo [5/5] Checking remote repository...
for /f "tokens=*" %%i in ('git remote get-url origin 2^>nul') do set REMOTE_URL=%%i

if "%REMOTE_URL%"=="" (
    echo.
    echo ========================================================
    echo  No GitHub remote 'origin' found!
    echo ========================================================
    echo.
    echo  1. Create a NEW repository on GitHub named 'twitch_music_panel'
    echo     at: https://github.com/new
    echo.
    echo  Default: https://github.com/kirtsoy/twitch_music_panel.git
    echo  (Press ENTER to use default, or paste another URL)
    echo.
    set "DEFAULT_REPO=https://github.com/kirtsoy/twitch_music_panel.git"
    set "REPO_URL="
    set /p REPO_URL="Enter GitHub Repository URL [%DEFAULT_REPO%]: "
    if "!REPO_URL!"=="" set "REPO_URL=!DEFAULT_REPO!"
    git remote add origin !REPO_URL!
    echo Added origin: !REPO_URL!
)

echo.
echo Pushing to GitHub (main branch)...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Repository successfully pushed to GitHub!
    echo ========================================================
    echo.
    echo  To activate GitHub Pages:
    echo  1. Open your repository on GitHub.
    echo  2. Go to Settings -^> Pages.
    echo  3. Under 'Build and deployment' -^> 'Branch':
    echo     Select 'main' / 'root' and click SAVE.
    echo.
    echo  Your player will be live at:
    echo  https://^<your-username^>.github.io/^<repo-name^>/
    echo ========================================================
) else (
    echo.
    echo [NOTICE] Push encountered an issue or authentication prompt.
    echo If prompted for credentials, use a GitHub Personal Access Token (PAT).
)

echo.
pause
