# Database Schema Guide
## دليل مخطط قاعدة البيانات

**Project:** QuizSpace Frontend
**Baseline:** `supabase/migrations/20260728_consolidated_baseline.sql`
**Last consolidated:** 2026-09-06

---

## ⚠️ CRITICAL: How the Database Works
## ⚠️ مهم: كيفية إدارة قاعدة البيانات

**This is a frontend-only repository. There is no backend server or migration runner.**
The database schema lives directly on the Supabase PostgreSQL instance and every
schema change is applied manually through the Supabase Dashboard SQL Editor.

المشروع ده frontend بس. مفيش backend ولا migration runner. أي تعديل على المخطط
بيتطبق يدوياً من Supabase Dashboard > SQL Editor.

---

## Current Layout
## الترتيب الحالي

Historically this folder held 114 incremental migration files (2026-07-28 →
2026-09-04). They were consolidated into a single baseline file that replays
all of them in their original chronological order:

```
supabase/migrations/
└── 20260728_consolidated_baseline.sql   ← المخطط الكامل في ملف واحد
```

- **Live database = source of truth.** قاعدة البيانات الحية هي مصدر الحقيقة.
- The full per-file history is preserved in Git (see the commit before
  "chore(db): consolidate migrations").
- The baseline only runs inside a Supabase project (it depends on the
  `auth`/`storage` schemas, roles `anon`/`authenticated`, and Supabase
  extensions) — لا يعمل على PostgreSQL عادي.

---

## Adding a Schema Change
## إضافة تعديل جديد على المخطط

1. Create a new file: `supabase/migrations/<YYYYMMDD>_<short_description>.sql`
2. Make it **idempotent** where possible (`CREATE OR REPLACE`, `DROP POLICY IF
   EXISTS` + `CREATE POLICY`, `DO $$ ... $$` guards for columns/tables).
3. Apply it to the live project via SQL Editor and verify.
4. Commit the file. When the folder grows unwieldy again, re-consolidate:
   concatenate files in filename order into a fresh baseline and delete the
   individual files (history stays in Git).

---

## Verification Queries
## استعلامات التحقق

```sql
-- All public tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- RLS enabled everywhere it should be
SELECT relname, relrowsecurity FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
ORDER BY relname;

-- RLS policies count per table
SELECT schemaname, tablename, COUNT(*) AS policies
FROM pg_policies WHERE schemaname = 'public'
GROUP BY 1, 2 ORDER BY 2;
```
