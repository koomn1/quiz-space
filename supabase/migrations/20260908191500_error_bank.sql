create table if not exists public.quiz_error_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null,
  quiz_title text not null default '',
  question_id text not null,
  question jsonb not null,
  user_answer text not null default '',
  correct_answer text not null default '',
  mistake_count integer not null default 1,
  last_attempted_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, quiz_id, question_id)
);

create index if not exists quiz_error_bank_user_idx on public.quiz_error_bank(user_id, resolved_at, last_attempted_at desc);

alter table public.quiz_error_bank enable row level security;

drop policy if exists "Users can view their own error bank" on public.quiz_error_bank;
create policy "Users can view their own error bank" on public.quiz_error_bank for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own error bank rows" on public.quiz_error_bank;
create policy "Users can insert their own error bank rows" on public.quiz_error_bank for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own error bank rows" on public.quiz_error_bank;
create policy "Users can update their own error bank rows" on public.quiz_error_bank for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own error bank rows" on public.quiz_error_bank;
create policy "Users can delete their own error bank rows" on public.quiz_error_bank for delete using (auth.uid() = user_id);

create or replace function public.touch_quiz_error_bank_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quiz_error_bank_touch_updated_at on public.quiz_error_bank;
create trigger quiz_error_bank_touch_updated_at before update on public.quiz_error_bank for each row execute function public.touch_quiz_error_bank_updated_at();

create or replace function public.upsert_quiz_error_bank_item(
  p_user_id uuid,
  p_quiz_id text,
  p_quiz_title text,
  p_question_id text,
  p_question jsonb,
  p_user_answer text,
  p_correct_answer text
)
returns public.quiz_error_bank
language plpgsql
security invoker
set search_path = public
as $$
declare result_row public.quiz_error_bank;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'Not allowed'; end if;
  insert into public.quiz_error_bank(user_id, quiz_id, quiz_title, question_id, question, user_answer, correct_answer)
  values(p_user_id, p_quiz_id, coalesce(p_quiz_title,''), p_question_id, p_question, coalesce(p_user_answer,''), coalesce(p_correct_answer,''))
  on conflict(user_id, quiz_id, question_id) do update set
    quiz_title = excluded.quiz_title,
    question = excluded.question,
    user_answer = excluded.user_answer,
    correct_answer = excluded.correct_answer,
    mistake_count = public.quiz_error_bank.mistake_count + 1,
    last_attempted_at = now(),
    resolved_at = null;
  select * into result_row from public.quiz_error_bank where user_id=p_user_id and quiz_id=p_quiz_id and question_id=p_question_id;
  return result_row;
end;
$$;

grant execute on function public.upsert_quiz_error_bank_item(uuid,text,text,text,jsonb,text,text) to authenticated;

create or replace function public.resolve_quiz_error_bank_item(p_id uuid)
returns void language sql security invoker set search_path = public as $$
  update public.quiz_error_bank set resolved_at = now() where id = p_id and user_id = auth.uid();
$$;
grant execute on function public.resolve_quiz_error_bank_item(uuid) to authenticated;

create or replace function public.clear_resolved_quiz_error_bank()
returns void language sql security invoker set search_path = public as $$
  delete from public.quiz_error_bank where user_id = auth.uid() and resolved_at is not null;
$$;
grant execute on function public.clear_resolved_quiz_error_bank() to authenticated;
