-- Read-only preflight for the standard-quiz answer-key migration.
-- Run against the target project before generating/applying the migration.
-- This script intentionally reports blockers; it does not mutate data.

with question_rows as (
  select
    q.id as quiz_id,
    q.title as quiz_title,
    item.ordinality::integer as question_number,
    item.value as question
  from public.quizzes q
  cross join lateral jsonb_array_elements(coalesce(q.questions, '[]'::jsonb))
    with ordinality as item(value, ordinality)
),
question_summary as (
  select
    count(*) as total_questions,
    count(*) filter (where coalesce(question->>'type', 'mcq') <> 'essay') as objective_questions,
    count(*) filter (where coalesce(question->>'type', 'mcq') = 'essay') as essay_questions,
    count(*) filter (
      where coalesce(question->>'type', 'mcq') <> 'essay'
        and (
          nullif(question->>'correctIndex', '') is null
          or (question->>'correctIndex') !~ '^-?[0-9]+$'
          or (question->>'correctIndex')::integer < 0
          or (question->>'correctIndex')::integer >= jsonb_array_length(coalesce(question->'options', '[]'::jsonb))
        )
    ) as invalid_objective_answer_indexes,
    count(*) filter (
      where coalesce(question->>'type', 'mcq') = 'essay'
        and nullif(question->>'correctAnswer', '') is null
    ) as essays_without_reference_answer,
    count(*) filter (
      where question ? 'explanation' and nullif(question->>'explanation', '') is not null
    ) as questions_with_explanation,
    count(*) filter (where nullif(question->>'id', '') is null) as questions_without_id
  from question_rows
),
duplicate_ids as (
  select count(*) as duplicate_quiz_question_id_groups
  from (
    select quiz_id, question->>'id'
    from question_rows
    group by quiz_id, question->>'id'
    having count(*) > 1
  ) duplicate_groups
)
select
  (select count(*) from public.quizzes) as quiz_count,
  question_summary.*,
  duplicate_ids.duplicate_quiz_question_id_groups,
  (select count(*) from question_rows where question ? 'correctIndex' or question ? 'correct_index') as rows_with_answer_index,
  (select count(*) from question_rows where question ? 'correctAnswer' or question ? 'correct_answer') as rows_with_answer_text
from question_summary
cross join duplicate_ids;

-- The following rows identify objective questions that must be corrected by
-- their owners before a strict answer-key backfill can complete. Never guess.
with question_rows as (
  select q.id as quiz_id, q.title as quiz_title,
         item.ordinality::integer as question_number, item.value as question
  from public.quizzes q
  cross join lateral jsonb_array_elements(coalesce(q.questions, '[]'::jsonb))
    with ordinality as item(value, ordinality)
)
select
  quiz_id,
  quiz_title,
  question_number,
  question->>'id' as question_id,
  question->>'type' as question_type,
  question->>'correctIndex' as correct_index,
  jsonb_array_length(coalesce(question->'options', '[]'::jsonb)) as option_count
from question_rows
where coalesce(question->>'type', 'mcq') <> 'essay'
  and (
    nullif(question->>'correctIndex', '') is null
    or (question->>'correctIndex') !~ '^-?[0-9]+$'
    or (question->>'correctIndex')::integer < 0
    or (question->>'correctIndex')::integer >= jsonb_array_length(coalesce(question->'options', '[]'::jsonb))
  )
order by quiz_id, question_number;

-- Public SELECT currently exposes the JSONB questions column. The migration
-- must revoke that column privilege and replace direct question reads with
-- safe, purpose-specific RPCs before it is applied.
select
  grantee,
  privilege_type,
  column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'quizzes'
  and column_name = 'questions'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
