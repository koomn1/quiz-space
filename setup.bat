@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
setlocal enabledelayedexpansion

:: ============================================================================
:: setup.bat — Quiz Space: تجهيز البيئة كاملة (تثبيت أدوات + تسجيل دخول + مكتبات)
:: ============================================================================
:: الاستخدام: شغّل الملف ده بدبل كليك أو من cmd: setup.bat
:: ============================================================================

set "TIMESTAMP=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "LOGFILE=setup_%TIMESTAMP%.log"
set "FAIL_COUNT=0"
set "OK_COUNT=0"

echo. > "%LOGFILE%"
call :log "بدء عملية التجهيز..."

:: ============================================================================
call :section "1) فحص Node.js وnpm"
:: ============================================================================
where node >nul 2>&1
if errorlevel 1 (
    call :log "❌ Node.js مش متسطب. سطّبه الأول من https://nodejs.org"
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do call :log "Node.js موجود: %%v"
call :ok "فحص Node.js"

where npm >nul 2>&1
if errorlevel 1 (
    call :log "❌ npm مش موجود."
    pause
    exit /b 1
)
call :ok "فحص npm"

:: ============================================================================
call :section "2) تثبيت GitHub CLI (gh)"
:: ============================================================================
where gh >nul 2>&1
if errorlevel 1 (
    call :log "gh CLI مش متسطب. جاري التثبيت عبر winget..."
    winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements >> "%LOGFILE%" 2>&1
    where gh >nul 2>&1
    if errorlevel 1 (
        call :fail "تثبيت gh CLI (سطّبه يدويًا من https://cli.github.com)"
    ) else (
        call :ok "تثبيت gh CLI"
    )
) else (
    call :log "gh CLI متسطب بالفعل — تخطي."
    call :ok "تثبيت gh CLI (كان متسطب بالفعل)"
)

:: ============================================================================
call :section "3) تثبيت Wrangler (Cloudflare CLI)"
:: ============================================================================
where wrangler >nul 2>&1
if errorlevel 1 (
    call :log "جاري تثبيت wrangler عالميًا عبر npm..."
    call npm install -g wrangler >> "%LOGFILE%" 2>&1
    if errorlevel 1 (call :fail "تثبيت wrangler") else (call :ok "تثبيت wrangler")
) else (
    call :log "wrangler متسطب بالفعل — تخطي."
    call :ok "تثبيت wrangler (كان متسطب بالفعل)"
)

:: ============================================================================
call :section "4) تثبيت Supabase CLI (كـ dev dependency للمشروع)"
:: ============================================================================
call npm install --save-dev supabase >> "%LOGFILE%" 2>&1
if errorlevel 1 (
    call :fail "تثبيت Supabase CLI"
) else (
    call :ok "تثبيت Supabase CLI"
    call :log "ملحوظة: استخدم 'npx supabase' مش 'supabase' مباشرة."
)

:: ============================================================================
call :section "5) تثبيت gh-pages (لنشر الفرونت إند)"
:: ============================================================================
call npm install --save-dev gh-pages >> "%LOGFILE%" 2>&1
if errorlevel 1 (call :fail "تثبيت gh-pages") else (call :ok "تثبيت gh-pages")

:: ============================================================================
call :section "6) تسجيل الدخول في GitHub"
:: ============================================================================
where gh >nul 2>&1
if errorlevel 1 (
    call :log "⚠️ gh CLI مش متاح — تخطي تسجيل الدخول."
) else (
    call gh auth status >nul 2>&1
    if errorlevel 1 (
        call :log "هيتفتح المتصفح لتسجيل الدخول في GitHub..."
        call gh auth login --web --git-protocol https
        if errorlevel 1 (call :fail "تسجيل الدخول GitHub") else (call :ok "تسجيل الدخول GitHub")
    ) else (
        call :log "مسجل دخول في GitHub بالفعل — تخطي."
        call :ok "تسجيل الدخول GitHub (كان مسجل بالفعل)"
    )
)

:: ============================================================================
call :section "7) تسجيل الدخول في Cloudflare (wrangler)"
:: ============================================================================
call npx --yes wrangler whoami >nul 2>&1
if errorlevel 1 (
    call :log "هيتفتح المتصفح لتسجيل الدخول في Cloudflare..."
    call npx --yes wrangler login
    if errorlevel 1 (call :fail "تسجيل الدخول Cloudflare") else (call :ok "تسجيل الدخول Cloudflare")
) else (
    call :log "مسجل دخول في Cloudflare بالفعل — تخطي."
    call :ok "تسجيل الدخول Cloudflare (كان مسجل بالفعل)"
)

:: ============================================================================
call :section "8) تسجيل الدخول في Supabase"
:: ============================================================================
call npx --yes supabase projects list >nul 2>&1
if errorlevel 1 (
    call :log "هيتفتح المتصفح لتسجيل الدخول في Supabase..."
    call npx --yes supabase login
    if errorlevel 1 (call :fail "تسجيل الدخول Supabase") else (call :ok "تسجيل الدخول Supabase")
) else (
    call :log "مسجل دخول في Supabase بالفعل — تخطي."
    call :ok "تسجيل الدخول Supabase (كان مسجل بالفعل)"
)

:: ============================================================================
call :section "9) تثبيت مكتبات المشروع (الفرونت إند)"
:: ============================================================================
call npm install >> "%LOGFILE%" 2>&1
if errorlevel 1 (call :fail "npm install (فرونت إند)") else (call :ok "npm install (فرونت إند)")

:: ============================================================================
call :section "10) تثبيت مكتبات الـ Worker"
:: ============================================================================
if exist worker (
    pushd worker
    call npm install >> "..\%LOGFILE%" 2>&1
    if errorlevel 1 (call :fail "npm install (worker)") else (call :ok "npm install (worker)")
    popd
) else (
    call :log "⚠️ مجلد worker مش موجود هنا — تخطي."
)

:: ============================================================================
call :section "النتيجة النهائية"
:: ============================================================================
call :log ""
call :log "عدد الخطوات الناجحة: !OK_COUNT!"
call :log "عدد الخطوات الفاشلة: !FAIL_COUNT!"
call :log ""

if !FAIL_COUNT! EQU 0 (
    call :log "🎉 البيئة جاهزة بالكامل."
    echo.
    echo ==========================================
    echo 🎉 تم بنجاح — البيئة جاهزة. راجع %LOGFILE% للتفاصيل
    echo ==========================================
    echo الخطوة الجاية: شغّل deploy.bat للنشر.
) else (
    call :log "⚠️ في خطوات فشلت — راجع الـ log."
    echo.
    echo ==========================================
    echo ⚠️ فيه أخطاء — راجع %LOGFILE% للتفاصيل
    echo ==========================================
)

pause
exit /b 0

:: ============================================================================
:: دوال مساعدة
:: ============================================================================
:log
echo [%DATE% %TIME%] %~1
echo [%DATE% %TIME%] %~1 >> "%LOGFILE%"
goto :eof

:section
call :log ""
call :log "==================== %~1 ===================="
goto :eof

:ok
set /a OK_COUNT+=1
call :log "✅ نجحت: %~1"
goto :eof

:fail
set /a FAIL_COUNT+=1
call :log "❌ فشلت: %~1"
goto :eof