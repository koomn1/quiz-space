# Database Schema Migration Guide
## دليل تطبيق تحديثات قاعدة البيانات

**Project:** QuizSpace Frontend  
**Migration Version:** 2.0.1 (PG14/15 compatible)  
**Date:** 2026-07-23

---

## ⚠️ CRITICAL: How to Deploy
## ⚠️ مهم: كيفية التطبيق

**This is a frontend-only repository. The database schema must be applied directly to your Supabase PostgreSQL instance via the Supabase Dashboard SQL Editor. There is no backend server or migration runner in this project.**

المشروع ده عبارة عن frontend بس. لازم تطبقMigration دي مباشرة على قاعدة بيانات Supabase من خلال SQL Editor في Dashboard. مفيش backend أو migrate runner في المشروع.

**Compatibility:** This migration uses `DROP POLICY IF EXISTS ... CREATE POLICY` instead of `CREATE POLICY IF NOT EXISTS` because Supabase's PostgreSQL version may not support PG16+ syntax.

---

## Step 1: Open Supabase SQL Editor
## الخطوة 1: افتح SQL Editor في Supabase

1. Go to your Supabase project dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **"New query"**

---

## Step 2: Run the Migration
## الخطوة 2: شغل Migration

1. Open the file:
   ```
   supabase/migrations/20260723_schema_fixes_and_new_tables.sql
   ```

2. Copy the **ENTIRE** content of the file

3. Paste into the Supabase SQL Editor

4. Click **"Run"** (or press Ctrl+Enter)

5. Wait for the green success indicator

---

## Step 3: Verify Migration
## الخطوة 3: تحقق من التطبيق

### Check Tables Exist ✅
Run this query in the SQL Editor to verify all new tables were created:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables (look for these):**
- ✅ `subscription_plans`
- ✅ `account_categories`
- ✅ `coupon_usages`
- ✅ `seasons`
- ✅ `season_members`

### Check Constraints ✅
```sql
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE conrelid::regclass::text IN (
    'coupon_codes', 'users', 'premium_requests', 'season_members'
)
AND contype = 'c'
ORDER BY conrelid::regclass::text, conname;
```

### Check Triggers ✅
```sql
SELECT tgname, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgrelid::regclass::text IN ('users')
AND NOT tgisinternal
ORDER BY tgrelid::regclass::text;
```

### Check Indexes ✅
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN (
    'users', 'coupon_codes', 'premium_requests', 'season_members',
    'quizzes', 'completions', 'follows', 'classroom_students'
)
ORDER BY tablename, indexname;
```

---

## Step 4: Enable Realtime (If Not Already)
## الخطوة 4: فعّل Realtime

Supabase's realtime is created automatically by the migration. If you don't see new tables in the Realtime tab:

1. Go to **Replication** (left sidebar)
2. Enable for these tables:
   - `coupon_codes`
   - `coupon_usages`
   - `subscription_plans`
   - `account_categories`
   - `seasons`
   - `season_members`
   - `premium_requests`
   - `promotions`

---

## Step 5: Check RLS Policies
## الخطوة 5: تحقق من RLS Policies

Run this query to confirm policies were created:

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN (
    'users', 'coupon_codes', 'premium_requests', 'subscription_plans',
    'account_categories', 'coupon_usages', 'seasons', 'season_members',
    'quizzes', 'completions', 'notifications'
)
ORDER BY tablename, policyname;
```

**If you see existing old policies, they will be kept and only new ones are appended.**

---

## Step 6: Verify Functions
## الخطوة 6: تحقق من Functions

```sql
SELECT proname
FROM pg_proc
WHERE proname IN (
    'get_coupon_by_code',
    'record_coupon_usage',
    'get_season_leaderboard',
    'get_active_season',
    'enroll_in_season',
    'update_season_member_score',
    'update_user_category'
)
ORDER BY proname;
```

---

## Step 7: Rebuild Frontend
## الخطوة 7: ابنِ المشروع

```bash
npm run build
```

Then deploy to GitHub Pages as usual (`push.bat` or `git push`).

---

## 🗑️ Rollback (If Something Goes Wrong)
## عودة لو حصل خطأ

If you need to rollback, run this in SQL Editor **BEFORE** re-applying:

```sql
-- WARNING: This drops the new tables and functions
DROP TABLE IF EXISTS season_members CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS coupon_usages CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS account_categories CASCADE;
DROP FUNCTION IF EXISTS get_coupon_by_code;
DROP FUNCTION IF EXISTS record_coupon_usage;
DROP FUNCTION IF EXISTS get_season_leaderboard;
DROP FUNCTION IF EXISTS get_active_season;
DROP FUNCTION IF EXISTS enroll_in_season;
DROP FUNCTION IF EXISTS update_season_member_score;
DROP FUNCTION IF EXISTS update_user_category;
```

Then re-run the full migration.

---

## ✅ Post-Migration Checklist

| Check | How to Verify |
|-------|---------------|
| All new tables exist | SQL: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;` |
| Constraints are enforced | Try inserting invalid data (e.g., `discount_percent = 150` in `coupon_codes`) |
| RLS policies active | Query `pg_policies` as shown above |
| Functions work | `SELECT * FROM get_coupon_by_code('QUIZ50');` |
| Indexes exist | Query `pg_indexes` as shown above |
| Existing data preserved | Check that your current `users` and `coupon_codes` data is still intact |
| Frontend builds | `npm run build` succeeds |

---

## 📝 Notes

1. **All operations are idempotent** — Safe to run multiple times. Existing data is preserved.
2. **Unique constraint on `coupon_codes.code`** — If you have duplicate codes in production, remove them first before running.
3. **`season_members`** has a `UNIQUE(season_id, user_id)` constraint that prevents duplicate enrollments.
4. **Admin detection** relies on `is_founder` or `is_premium` fields in the `users` table. Make sure your super admin account has one of these set to `true`.
5. **RLS policies** allow public reads on most tables but only authenticated writes. Adjust as needed for your security model.

---

## 🔍 What Changed

### Tables Added
- `subscription_plans` - Centralized plan definitions
- `account_categories` - User category classifications (based on activity)
- `coupon_usages` - Tracks who used which coupon (enforces one-use-per-user)
- `seasons` - Competition/event seasons
- `season_members` - Season leaderboard participants

### Tables Fixed
- `users` - Added `plan_id`, `is_suspended`, `is_lifetime`, `is_founder`, `category_id`, `renewal_date`; unique constraints; indexes
- `coupon_codes` - Added CHECK constraints (discount 0-100%), snake_case standardization, unique on code
- `premium_requests` - Added foreign keys, CHECK on status, standardized columns
- `quizzes`, `completions`, `question_ratings`, `notifications`, `follows`, `classrooms`, `classroom_students`, `classroom_messages` - Timestamps, CHECK constraints, indexes

### Functions Added
- `get_coupon_by_code(p_code)` - Case-insensitive coupon lookup
- `record_coupon_usage(...)` - Atomic coupon usage with race condition protection
- `get_active_season()` - Returns currently active season
- `get_season_leaderboard(p_season_id, p_limit)` - Season ranking
- `enroll_in_season(p_season_id, p_user_id)` - Enroll user in season
- `update_season_member_score(...)` - Add score to member
- `update_user_category(p_user_id)` - Auto-categorize user based on activity

### RLS Policies
- All tables now have RLS enabled with appropriate policies
- Public read, admin write pattern
- Users can update their own data where appropriate
