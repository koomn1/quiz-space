@echo off
chcp 65001 > nul
echo.
echo ========================================
echo    Quiz Space - Build and Deploy Tool
echo ========================================
echo.

REM ── Check git login ──────────────────────────────────────────────
echo [1/5] Checking GitHub login...
git config --global user.email > nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Git is not configured. Let's set it up.
    set /p GIT_EMAIL=Enter your GitHub email: 
    set /p GIT_NAME=Enter your GitHub name: 
    git config --global user.email "%GIT_EMAIL%"
    git config --global user.name "%GIT_NAME%"
)

REM Check if we have credentials stored (try a dry-run ls-remote)
git ls-remote https://github.com/koomn1/quiz-space.git > nul 2>&1
if %errorlevel% neq 0 (
    echo [!] GitHub authentication required.
    echo     Opening GitHub login via browser...
    echo     If using HTTPS, you need a Personal Access Token.
    echo     Get one from: https://github.com/settings/tokens
    echo.
    set /p GIT_TOKEN=Paste your GitHub Personal Access Token here: 
    git remote set-url origin https://%GIT_TOKEN%@github.com/koomn1/quiz-space.git
) else (
    git remote set-url origin https://github.com/koomn1/quiz-space.git
)

REM ── Build the project ─────────────────────────────────────────────
echo.
echo [2/5] Building the project...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed! Fix the errors above before deploying.
    pause
    exit /b 1
)
echo [OK] Build successful!

REM ── Stage all changes ─────────────────────────────────────────────
echo.
echo [3/5] Staging all changes...
git add -A
git status --short

REM ── Commit if there are changes ───────────────────────────────────
echo.
echo [4/5] Committing changes...
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo [!] No new changes to commit. Pushing existing commits...
) else (
    set /p COMMIT_MSG=Enter commit message (or press Enter for auto-message): 
    if "%COMMIT_MSG%"=="" (
        for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set DT=%%I
        set COMMIT_MSG=Update %DT:~0,4%-%DT:~4,2%-%DT:~6,2% %DT:~8,2%:%DT:~10,2%
    )
    git commit -m "%COMMIT_MSG%"
)

REM ── Push to GitHub ────────────────────────────────────────────────
echo.
echo [5/5] Pushing to GitHub (this will trigger auto-deploy)...
git branch -M main
git push -u origin main --force
if %errorlevel% neq 0 (
    echo [ERROR] Push failed! Check your internet connection or GitHub credentials.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Done! GitHub Actions is now building
echo  and deploying your site automatically.
echo.
echo  Track progress at:
echo  https://github.com/koomn1/quiz-space/actions
echo ========================================
echo.
pause
