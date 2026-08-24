#!/usr/bin/env bash
set +e
cd "$(dirname "$0")/.."
pnpm audit --prod --json > /tmp/quizspace-qa-audit.json 2>&1
audit_status=$?
git grep -nE 'dangerouslySetInnerHTML|innerHTML[[:space:]]*=|eval\(|new Function\(|document\.write\(|localStorage\.setItem\([^,]*(token|password|secret)|VITE_[A-Z0-9_]*(KEY|TOKEN|SECRET)[[:space:]]*=[[:space:]]*["'"'"'][^"'"'"']+["'"'"']|-----BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY-----|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}' -- ':!pnpm-lock.yaml' ':!*.map' > /tmp/quizspace-qa-static-patterns.txt
grep -RInE --exclude-dir=node_modules --exclude-dir=.git 'supabase\.auth\.(signUp|signIn|verifyOtp)|rpc\(|fetch\(|XMLHttpRequest' src worker | head -260 > /tmp/quizspace-qa-api-surface.txt
echo "audit_exit=$audit_status"
echo '=== static patterns ==='
cat /tmp/quizspace-qa-static-patterns.txt
echo '=== dependency audit summary ==='
grep -E '"(severity|total|high|critical|moderate|low)"' /tmp/quizspace-qa-audit.json | head -80
echo '=== api/auth surface ==='
cat /tmp/quizspace-qa-api-surface.txt
