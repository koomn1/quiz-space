import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-promotion-cron-secret',
};

const REMINDER_TITLE = 'نقاطك اليومية في انتظارك';
const REMINDER_BODY = 'ادخل QuizSpace اليوم، حافظ على سلسلتك واستفد من عجلة الحظ والسؤال اليومي.';
const REMINDER_URL = 'https://quiz-space-app.pages.dev/#/dashboard/motivation';
const REMINDER_CATEGORY = 'system';
const REMINDER_EVENT_TITLE = 'daily_engagement_reminder';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const cronSecret = req.headers.get('x-promotion-cron-secret');
  if (!cronSecret || cronSecret !== Deno.env.get('PROMOTION_CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const today = new Date().toISOString().slice(0, 10);
    const dayStart = `${today}T00:00:00.000Z`;

    const [{ data: subscriptions, error: subscriptionError }, { data: streaks, error: streakError }] = await Promise.all([
      adminClient.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').limit(5000),
      adminClient.from('user_streaks').select('user_id, last_login_date').limit(5000),
    ]);
    if (subscriptionError) throw subscriptionError;
    if (streakError) throw streakError;

    const userIds = [...new Set((subscriptions ?? []).map((row: any) => String(row.user_id)).filter(Boolean))];
    if (!userIds.length) return new Response(JSON.stringify({ sent: 0, skipped: 0, reason: 'no_subscriptions' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: events, error: eventError } = await adminClient
      .from('push_notification_events')
      .select('user_id')
      .eq('title', REMINDER_EVENT_TITLE)
      .gte('created_at', dayStart)
      .in('user_id', userIds)
      .limit(5000);
    if (eventError) throw eventError;

    const streakByUser = new Map((streaks ?? []).map((row: any) => [String(row.user_id), row.last_login_date ? String(row.last_login_date).slice(0, 10) : null]));
    const alreadyReminded = new Set((events ?? []).map((row: any) => String(row.user_id)));
    const uniqueUsers = new Set<string>();
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@spacequiz.app';
    webpush.setVapidDetails(vapidSubject, Deno.env.get('VAPID_PUBLIC_KEY') ?? '', Deno.env.get('VAPID_PRIVATE_KEY') ?? '');

    let sent = 0;
    let skipped = 0;
    const expiredIds: string[] = [];
    for (const subscription of subscriptions ?? []) {
      const userId = String(subscription.user_id);
      if (uniqueUsers.has(userId)) { skipped++; continue; }
      uniqueUsers.add(userId);
      if (streakByUser.get(userId) === today || alreadyReminded.has(userId)) { skipped++; continue; }

      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify({ title: REMINDER_TITLE, body: REMINDER_BODY, url: REMINDER_URL, category: REMINDER_CATEGORY, tag: 'daily-engagement-spacequiz' }),
        );
        await adminClient.from('push_notification_events').insert({
          user_id: userId,
          category: REMINDER_CATEGORY,
          title: REMINDER_EVENT_TITLE,
          body: REMINDER_BODY,
          target_url: REMINDER_URL,
        });
        sent++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) expiredIds.push(String(subscription.id));
        console.warn('Daily reminder delivery failed:', statusCode || 'unknown');
      }
    }

    if (expiredIds.length) await adminClient.from('push_subscriptions').delete().in('id', expiredIds);
    return new Response(JSON.stringify({ sent, skipped, removed: expiredIds.length, date: today }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Daily engagement reminder failed:', error instanceof Error ? error.message : 'unknown error');
    return new Response(JSON.stringify({ error: 'daily_reminder_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
