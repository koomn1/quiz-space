import type { Env } from './platform';

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'dead_letter';

export interface TaskRun {
  id: string;
  task_type: string;
  idempotency_key: string;
  user_id: string | null;
  status: TaskStatus;
  attempt_count: number;
  max_attempts: number;
  payload_hash: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  heartbeat_at: string | null;
}

export interface ClaimTaskInput {
  taskType: string;
  idempotencyKey: string;
  userId?: string | null;
  payloadHash?: string | null;
  maxAttempts?: number;
}

function baseUrl(env: Env): string {
  return env.SUPABASE_URL.replace(/\/$/, '');
}

function headers(env: Env, authHeader: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: authHeader || `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`,
  };
}

async function rpc<T>(env: Env, authHeader: string, name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${baseUrl(env)}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(env, authHeader),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Task ledger RPC ${name} failed (${response.status})`);
  return await response.json() as T;
}

export async function claimTask(env: Env, authHeader: string, input: ClaimTaskInput): Promise<TaskRun> {
  const result = await rpc<TaskRun | TaskRun[]>(env, authHeader, 'claim_worker_task', {
    p_task_type: input.taskType,
    p_idempotency_key: input.idempotencyKey,
    p_user_id: input.userId || null,
    p_payload_hash: input.payloadHash || null,
    p_max_attempts: Math.max(1, Math.min(input.maxAttempts || 3, 5)),
  });
  return Array.isArray(result) ? result[0] : result;
}

export async function heartbeatTask(env: Env, authHeader: string, taskId: string): Promise<void> {
  await rpc(env, authHeader, 'heartbeat_worker_task', { p_task_id: taskId });
}

export async function finishTask(env: Env, authHeader: string, taskId: string, status: Extract<TaskStatus, 'succeeded' | 'failed' | 'dead_letter'>, error?: string): Promise<void> {
  await rpc(env, authHeader, 'finish_worker_task', {
    p_task_id: taskId,
    p_status: status,
    p_error: error ? error.slice(0, 2_000) : null,
  });
}

export async function listStaleTasks(env: Env, authHeader: string, staleAfterMinutes = 15): Promise<TaskRun[]> {
  const response = await fetch(`${baseUrl(env)}/rest/v1/worker_task_runs?status=eq.running&heartbeat_at=lt.${encodeURIComponent(new Date(Date.now() - staleAfterMinutes * 60_000).toISOString())}&order=heartbeat_at.asc&limit=100`, {
    headers: headers(env, authHeader),
  });
  if (!response.ok) throw new Error(`Task ledger stale-task query failed (${response.status})`);
  return await response.json() as TaskRun[];
}

export function retryDelaySeconds(attempt: number): number {
  return Math.min(300, Math.max(5, 2 ** Math.max(0, attempt - 1) * 5));
}

export function shouldRetryTask(task: Pick<TaskRun, 'status' | 'attempt_count' | 'max_attempts'>): boolean {
  return task.status === 'failed' && task.attempt_count < task.max_attempts;
}

export function taskIdempotencyKey(taskType: string, key: string): string {
  return `${taskType}:${key.trim().slice(0, 240)}`;
}
