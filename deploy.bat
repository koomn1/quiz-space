@echo off
title Quiz Space - Control Panel

:MENU
cls
echo ========================================
echo       QUIZ SPACE - CONTROL PANEL
echo ========================================
echo.
echo   [1] Build Project (npm run build)
echo   [2] Quick Push (Without Build)
echo   [3] Build + Git Push (Recommended)
echo   [4] Check Changes (git status)
echo   [5] Exit
echo.
echo ========================================
set /p opt="Choose an option [1-5]: "

if "%opt%"=="1" goto BUILD_ONLY
if "%opt%"=="2" goto PUSH_ONLY
if "%opt%"=="3" goto BUILD_AND_PUSH
if "%opt%"=="4" goto STATUS
if "%opt%"=="5" goto END

echo Invalid option, try again.
timeout /t 2 >nul
goto MENU

:BUILD_ONLY
echo.
echo === Running Build Test ===
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [X] Build Failed! Fix errors before pushing.
) else (
    echo.
    echo [V] Build Successful!
)
pause
goto MENU

:PUSH_ONLY
echo.
echo === Quick Push ===
git add .
set /p msg="Enter commit message (Press Enter for 'update code'): "
if "%msg%"=="" set msg=update code
git commit -m "%msg%"
git push
echo.
echo === Done! ===
pause
goto MENU

:BUILD_AND_PUSH
echo.
echo === Step 1: Building Project ===
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [X] Build failed! Push stopped to prevent breaking production.
    pause
    goto MENU
)

echo.
echo === Step 2: Pushing to GitHub ===
git add .
set /p msg="Enter commit message (Press Enter for 'update code'): "
if "%msg%"=="" set msg=update code
git commit -m "%msg%"
git push
echo.
echo === Done Successfully! ===
pause
goto MENU

:STATUS
echo.
echo === Current Git Status ===
git status
echo.
pause
goto MENU

:END
exit
