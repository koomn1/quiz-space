# Database Schema Guide
## دليل مخطط قاعدة البيانات

**Project:** QuizSpace Frontend
**Baseline snapshot:** `supabase/migrations/20260728_consolidated_baseline.sql`
**Baseline contents consolidated through:** 2026-09-06

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

The baseline is the schema snapshot through 2026-09-06. Later changes remain as
incremental SQL files in the same folder and must be applied after the baseline
in filename order on a fresh project:

```
supabase/migrations/
├── 20260728_consolidated_baseline.sql
└── <later timestamped migrations>.sql
```

- **Live database = source of truth.** قاعدة البيانات الحية هي مصدر الحقيقة.
- Never replay the baseline over an existing live database. Apply only the
  migrations that are newer than the schema already installed there.
- SQL migrations are applied manually in the Supabase SQL Editor; they are not
  deployed by the website workflow. Record the applied filename in the release
  notes so the database and application versions remain traceable.
- The baseline depends on Supabase's `auth`/`storage` schemas, roles, and
  extensions; it does not run on plain PostgreSQL.

---

## Adding a Schema Change
## إضافة تعديل جديد على المخطط

1. Create a new file: `supabase/migrations/<YYYYMMDD>_<short_description>.sql`
2. Make it **idempotent** where possible (`CREATE OR REPLACE`, `DROP POLICY IF
   EXISTS` + `CREATE POLICY`, `DO $$ ... $$` guards for columns/tables).
3. Apply it to the intended Supabase project via SQL Editor and verify.
4. Commit the file and record the project/migration version in the release
   notes. When the folder grows unwieldy again, re-consolidate only after
   confirming the live schema and preserving the post-baseline migrations.

## Edge Function deployment

The GitHub Actions workflow `.github/workflows/deploy-supabase-functions.yml`
deploys the active Edge Functions when their sources change on `main`, or when
run manually. Configure the repository secret `SUPABASE_ACCESS_TOKEN`; the
project ref is derived from `VITE_SUPABASE_URL`. The deployed Functions verify
Firebase, Supabase bearer tokens, or the scheduled-job secret in their own
handlers, so the workflow explicitly disables the platform JWT pre-check.

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
