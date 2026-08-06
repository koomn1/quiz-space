import { supabase } from './supabaseClient';

// Attaches the current Supabase session's access token as a Bearer header.
// Used only for calling the Cloudflare AI Worker (AI generation/OCR endpoints) - direct
// database reads/writes go through the Supabase client directly instead (see db.ts), where
// auth is handled automatically by the client and enforced server-side via RLS policies.
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = { ...(options.headers || {}) } as Record<string, string>;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return fetch(url, { ...options, headers });
}
