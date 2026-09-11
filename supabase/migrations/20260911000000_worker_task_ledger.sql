-- Unified task ledger for AI, extraction, and future queue-backed workloads.
create table if not exists public.worker_task_runs (
  id uuid primary key default gen_random_uuid(),
  task_type text not null check (char_length(task_type) between 1 and 80),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 320),
  user_id uuid,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  payload_hash text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  heartbeat_at timestamptz,
  unique (task_type, idempotency_key)
);

create index if not exists worker_task_runs_status_heartbeat_idx
  on public.worker_task_runs (status, heartbeat_at);
create index if not exists worker_task_runs_user_created_idx
  on public.worker_task_runs (user_id, created_at desc);

alter table public.worker_task_runs enable row level security;
revoke all on public.worker_task_runs from anon;
revoke all on public.worker_task_runs from authenticated;
grant select on public.worker_task_runs to authenticated;

drop policy if exists worker_task_runs_owner_read on public.worker_task_runs;
create policy worker_task_runs_owner_read
  on public.worker_task_runs for select to authenticated
  using (user_id = auth.uid());

create or replace function public.claim_worker_task(
  p_task_type text,
  p_idempotency_key text,
  p_user_id uuid default null,
  p_payload_hash text default null,
  p_max_attempts integer default 3
)
returns public.worker_task_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.worker_task_runs;
  v_user_id uuid := coalesce(p_user_id, auth.uid());
begin
  if auth.role() <> 'service_role' and (v_user_id is null or v_user_id <> auth.uid()) then
    raise exception 'not authorized';
  end if;
  if nullif(trim(p_task_type), '') is null or nullif(trim(p_idempotency_key), '') is null then
    raise exception 'task type and idempotency key are required';
  end if;

  insert into public.worker_task_runs(task_type, idempotency_key, user_id, status, max_attempts, payload_hash, updated_at)
  values (left(trim(p_task_type), 80), left(trim(p_idempotency_key), 320), v_user_id, 'queued', greatest(1, least(coalesce(p_max_attempts, 3), 5)), p_payload_hash, now())
  on conflict (task_type, idempotency_key) do nothing;

  select * into v_task
  from public.worker_task_runs
  where task_type = left(trim(p_task_type), 80)
    and idempotency_key = left(trim(p_idempotency_key), 320)
  for update;

  if v_task.status in ('succeeded', 'running') then
    return v_task;
  end if;
  if v_task.status = 'dead_letter' then
    return v_task;
  end if;

  update public.worker_task_runs
  set status = 'running',
      attempt_count = attempt_count + 1,
      started_at = coalesce(started_at, now()),
      heartbeat_at = now(),
      updated_at = now(),
      finished_at = null
  where id = v_task.id
  returning * into v_task;
  return v_task;
end;
$$;

create or replace function public.heartbeat_worker_task(p_task_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.worker_task_runs
  set heartbeat_at = now(), updated_at = now()
  where id = p_task_id
    and (auth.role() = 'service_role' or user_id = auth.uid())
    and status = 'running';
$$;

create or replace function public.finish_worker_task(
  p_task_id uuid,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := case when p_status in ('succeeded', 'failed', 'dead_letter') then p_status else null end;
begin
  if v_status is null then raise exception 'invalid task status'; end if;
  update public.worker_task_runs
  set status = v_status,
      last_error = case when p_error is null then null else left(p_error, 2000) end,
      finished_at = case when v_status in ('succeeded', 'dead_letter') then now() else null end,
      heartbeat_at = now(),
      updated_at = now()
  where id = p_task_id
    and (auth.role() = 'service_role' or user_id = auth.uid());
end;
$$;

revoke all on function public.claim_worker_task(text, text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.heartbeat_worker_task(uuid) from public, anon, authenticated;
revoke all on function public.finish_worker_task(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_worker_task(text, text, uuid, text, integer) to authenticated, service_role;
grant execute on function public.heartbeat_worker_task(uuid) to authenticated, service_role;
grant execute on function public.finish_worker_task(uuid, text, text) to authenticated, service_role;
