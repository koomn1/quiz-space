import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Category = 'classroom' | 'community' | 'quiz' | 'promotion' | 'system';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const cronSecret = req.headers.get('x-promotion-cron-secret');
    const isCron = Boolean(cronSecret && cronSecret === Deno.env.get('PROMOTION_CRON_SECRET'));
    let user: { id: string } | null = null;
    if (!isCron) {
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.replace('Bearer ', '');
      const { data: authData, error: authError } = await adminClient.auth.getUser(token);
      user = authData.user;
      if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const title = String(body.title || '').trim();
    const message = String(body.body || '').trim();
    const url = String(body.url || '/');
    const category = (body.category || 'system') as Category;
    const classId = body.classId ? String(body.classId) : null;
    if (!title || !message) return new Response('title and body are required', { status: 400, headers: corsHeaders });
    if (!['classroom', 'community', 'quiz', 'promotion', 'system'].includes(category)) {
      return new Response('invalid category', { status: 400, headers: corsHeaders });
    }

    const { data: adminRow } = user
      ? await adminClient.from('users').select('is_admin').eq('uid', user.id).maybeSingle()
      : { data: { is_admin: true } };
    if (category === 'promotion' && !adminRow?.is_admin && !isCron) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    let recipientIds: string[] = Array.isArray(body.recipientIds)
      ? body.recipientIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];

    if (classId) {
      const { data: classroom } = await adminClient.from('classrooms').select('id, created_by').eq('id', classId).maybeSingle();
      if (!classroom) return new Response('classroom not found', { status: 404, headers: corsHeaders });
      if (classroom.created_by !== user?.id) {
        const { data: membership } = await adminClient.from('classroom_students').select('student_id').eq('class_id', classId).eq('student_id', user?.id || '').maybeSingle();
        if (!membership) return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }
      const { data: members } = await adminClient.from('classroom_students').select('student_id').eq('class_id', classId);
      recipientIds = [...new Set([classroom.created_by, ...(members || []).map((row: any) => row.student_id)])].filter((id) => id !== user?.id);
    } else if (category === 'community' || category === 'system') {
      const { data: users } = user
        ? await adminClient.from('users').select('uid').neq('uid', user.id)
        : await adminClient.from('users').select('uid');
      recipientIds = (users || []).map((row: any) => row.uid);
    }

    let query = adminClient.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth');
    if (recipientIds.length) query = query.in('user_id', recipientIds);
    const { data: subscriptions, error: readError } = await query;
    if (readError) throw readError;

    const userIds = [...new Set((subscriptions || []).map((s: any) => s.user_id))];
    const { data: preferences } = userIds.length
      ? await adminClient.from('push_notification_preferences').select('user_id, classroom_missed_count, classroom_paused, last_promotion_at').in('user_id', userIds)
      : { data: [] };
    const prefMap = new Map<string, { classroom_missed_count?: number; classroom_paused?: boolean; last_promotion_at?: string | null }>((preferences || []).map((p: any) => [p.user_id as string, p]));

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@spacequiz.app',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
    );

    let sent = 0;
    const expiredIds: string[] = [];
    for (const subscription of subscriptions ?? []) {
      const pref = prefMap.get(subscription.user_id);
      if (category === 'classroom' && (pref?.classroom_paused || Number(pref?.classroom_missed_count || 0) >= 3)) continue;
      if (category === 'promotion' && pref?.last_promotion_at && Date.now() - Date.parse(pref.last_promotion_at) < 6 * 60 * 60 * 1000) continue;

      const { data: event } = await adminClient.from('push_notification_events').insert({
        user_id: subscription.user_id,
        category,
        title,
        body: message,
        target_url: url,
      }).select('id').single();

      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, JSON.stringify({ title, body: message, url, category, eventId: event?.id || null, tag: `${category}-spacequiz` }));
        sent++;

        const nextMissed = category === 'classroom' ? Number(pref?.classroom_missed_count || 0) + 1 : Number(pref?.classroom_missed_count || 0);
        await adminClient.from('push_notification_preferences').upsert({
          user_id: subscription.user_id,
          classroom_missed_count: nextMissed,
          classroom_paused: category === 'classroom' && nextMissed >= 3 ? true : Boolean(pref?.classroom_paused),
          last_promotion_at: category === 'promotion' ? new Date().toISOString() : (pref?.last_promotion_at || null),
          updated_at: new Date().toISOString(),
        });
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
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
