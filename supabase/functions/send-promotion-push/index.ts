import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const { data: adminRow } = await adminClient.from('users').select('is_admin').eq('uid', user.id).single();
    if (!adminRow?.is_admin) return new Response('Forbidden', { status: 403, headers: corsHeaders });

    const { title, body, url = '/' } = await req.json();
    if (!title || !body) return new Response('title and body are required', { status: 400, headers: corsHeaders });

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@spacequiz.app',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
    );

    const { data: subscriptions, error: readError } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth');
    if (readError) throw readError;

    let sent = 0;
    const expiredIds: string[] = [];
    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, JSON.stringify({ title, body, url, tag: 'spacequiz-promotion' }));
        sent++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) expiredIds.push(subscription.id);
        console.warn('Push delivery failed:', statusCode || error);
      }
    }

    if (expiredIds.length) await adminClient.from('push_subscriptions').delete().in('id', expiredIds);
    return new Response(JSON.stringify({ sent, removed: expiredIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
