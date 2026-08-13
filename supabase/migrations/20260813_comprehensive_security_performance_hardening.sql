-- Comprehensive security and performance hardening.
-- All privileged database behavior remains enforced server-side.

CREATE INDEX IF NOT EXISTS idx_bookmarks_quiz_id
  ON public.bookmarks (quiz_id);
CREATE INDEX IF NOT EXISTS idx_classroom_lesson_videos_class_id
  ON public.classroom_lesson_videos (class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_sender_id
  ON public.classroom_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_daily_quiz_slots_quiz_id
  ON public.daily_quiz_slots (quiz_id);
CREATE INDEX IF NOT EXISTS idx_daily_quiz_user_slots_quiz_id
  ON public.daily_quiz_user_slots (quiz_id);
CREATE INDEX IF NOT EXISTS idx_featured_quizzes_quiz_id
  ON public.featured_quizzes (quiz_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id
  ON public.post_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_reward_inventory_item_id
  ON public.reward_inventory (item_id);
CREATE INDEX IF NOT EXISTS idx_reward_store_orders_item_id
  ON public.reward_store_orders (item_id);
CREATE INDEX IF NOT EXISTS idx_reward_store_orders_approved_by
  ON public.reward_store_orders (approved_by);
CREATE INDEX IF NOT EXISTS idx_user_reward_badges_badge_id
  ON public.user_reward_badges (badge_id);
CREATE INDEX IF NOT EXISTS idx_quiz_analysis_jobs_draft_user_id
  ON public.quiz_analysis_jobs (draft_user_id);

CREATE OR REPLACE FUNCTION public.claim_daily_gift()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_last DATE;
  v_streak INTEGER;
  v_day INTEGER;
  v_points INTEGER;
  v_coins INTEGER;
  v_bonus INTEGER := 0;
  v_inserted INTEGER := 0;
  v_tier TEXT;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_reward_balances (user_id, points, level, vip_tier)
  VALUES (v_user_id, 0, 1, 'none')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_daily_claim, daily_streak, vip_tier
  INTO v_last, v_streak, v_tier
  FROM public.user_reward_balances
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_last = v_today THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'claim_date', v_today,
      'streak', v_streak,
      'message', 'Already claimed today'
    );
  END IF;

  IF v_last = v_today - 1 THEN
    v_streak := GREATEST(1, v_streak + 1);
  ELSE
    v_streak := 1;
  END IF;

  v_day := ((v_streak - 1) % 7) + 1;
  v_points := CASE v_day
    WHEN 1 THEN 10 WHEN 2 THEN 15 WHEN 3 THEN 20 WHEN 4 THEN 25
    WHEN 5 THEN 35 WHEN 6 THEN 50 ELSE 100
  END;
  v_coins := CASE v_day
    WHEN 1 THEN 20 WHEN 2 THEN 25 WHEN 3 THEN 35 WHEN 4 THEN 45
    WHEN 5 THEN 60 WHEN 6 THEN 80 ELSE 150
  END;

  SELECT daily_coin_bonus
  INTO v_bonus
  FROM public.vip_tiers
  WHERE id = v_tier;
  v_coins := v_coins + COALESCE(v_bonus, 0);

  INSERT INTO public.daily_gift_claims (user_id, claim_date, day_number, points_reward, coins_reward)
  VALUES (v_user_id, v_today, v_day, v_points, v_coins)
  ON CONFLICT (user_id, claim_date) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('claimed', false, 'claim_date', v_today, 'streak', v_streak);
  END IF;

  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (
    v_user_id,
    v_points,
    'daily_gift',
    'daily_gift:' || v_today,
    v_today::text,
    jsonb_build_object('day_number', v_day, 'coins', v_coins)
  );

  UPDATE public.user_reward_balances
  SET
    points = points + v_points,
    coins = coins + v_coins,
    daily_streak = v_streak,
    last_daily_claim = v_today,
    level = public.reward_level_for_points(points + v_points),
    vip_tier = public.vip_tier_for_points(points + v_points),
    vip_updated_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'claimed', true,
    'claim_date', v_today,
    'day_number', v_day,
    'streak', v_streak,
    'points', v_points,
    'coins', v_coins
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_in_season(p_season_id TEXT, p_user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id TEXT;
  v_season public.seasons%ROWTYPE;
BEGIN
  IF auth.uid()::text IS NULL OR auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_season_id IS NULL OR length(trim(p_season_id)) = 0 THEN
    RAISE EXCEPTION 'Invalid season';
  END IF;

  SELECT *
  INTO v_season
  FROM public.seasons
  WHERE id = trim(p_season_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Season not found';
  END IF;
  IF NOT v_season.is_active THEN
    RAISE EXCEPTION 'Season is not active';
  END IF;
  IF v_season.max_participants IS NOT NULL
    AND (SELECT count(*) FROM public.season_members WHERE season_id = v_season.id) >= v_season.max_participants THEN
    RAISE EXCEPTION 'Season is full';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.season_members
    WHERE season_id = v_season.id AND user_id = p_user_id
  ) THEN
    v_member_id := 'sm_' || extract(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    INSERT INTO public.season_members (id, season_id, user_id, total_score, quizzes_completed)
    VALUES (v_member_id, v_season.id, p_user_id, 0, 0);
    RETURN v_member_id;
  END IF;

  RETURN 'already_enrolled';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_challenge(
  p_class_id TEXT,
  p_title TEXT,
  p_description TEXT,
  p_target INTEGER,
  p_end_date TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_end_date DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_class_id IS NULL OR length(trim(p_class_id)) = 0 OR length(trim(p_class_id)) > 100 THEN
    RAISE EXCEPTION 'Invalid classroom';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 OR length(trim(p_title)) > 160 THEN
    RAISE EXCEPTION 'Invalid challenge title';
  END IF;
  IF p_description IS NOT NULL AND length(p_description) > 2000 THEN
    RAISE EXCEPTION 'Challenge description is too long';
  END IF;
  IF p_target IS NULL OR p_target < 1 OR p_target > 100000 THEN
    RAISE EXCEPTION 'Invalid challenge target';
  END IF;

  v_end_date := p_end_date::date;
  IF v_end_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Challenge end date must not be in the past';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = trim(p_class_id)
      AND c.created_by = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = v_user_id AND u.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only the classroom owner or an administrator can create challenges';
  END IF;

  INSERT INTO public.group_challenges (
    id, class_id, title, description, target_quizzes, start_date, end_date, created_by
  ) VALUES (
    gen_random_uuid(), trim(p_class_id), trim(p_title), NULLIF(trim(COALESCE(p_description, '')), ''),
    p_target, CURRENT_DATE::text, v_end_date::text, v_user_id
  );

  RETURN jsonb_build_object('success', true, 'message', 'Group challenge created');
END;
$$;

CREATE OR REPLACE FUNCTION public.contribute_to_group_challenge(p_challenge_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_challenge public.group_challenges%ROWTYPE;
  v_already BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_challenge_id IS NULL OR length(trim(p_challenge_id)) = 0 THEN
    RAISE EXCEPTION 'Invalid challenge';
  END IF;

  SELECT *
  INTO v_challenge
  FROM public.group_challenges
  WHERE id = trim(p_challenge_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF v_challenge.completed OR v_challenge.end_date::date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Challenge is no longer active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = v_challenge.class_id AND c.created_by = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.classroom_students cs
    WHERE cs.class_id = v_challenge.class_id AND cs.student_id = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = v_user_id AND u.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only classroom members can contribute';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.group_challenge_progress
    WHERE challenge_id = v_challenge.id
      AND user_id = v_user_id
      AND contributed_at >= now() - interval '1 day'
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already contributed today');
  END IF;

  INSERT INTO public.group_challenge_progress (id, challenge_id, user_id)
  VALUES (gen_random_uuid(), v_challenge.id, v_user_id);

  UPDATE public.group_challenges
  SET
    current_quizzes = current_quizzes + 1,
    completed = current_quizzes + 1 >= target_quizzes,
    updated_at = now()
  WHERE id = v_challenge.id;

  RETURN jsonb_build_object(
    'success', true,
    'current', v_challenge.current_quizzes + 1,
    'target', v_challenge.target_quizzes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.broadcast_cosmo_messages(p_text TEXT, p_receiver_ids TEXT[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_uid TEXT := auth.uid()::text;
  v_count INTEGER := 0;
  v_receiver TEXT;
  v_receiver_name TEXT;
BEGIN
  IF v_admin_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = v_admin_uid AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_text IS NULL OR length(trim(p_text)) = 0 OR length(p_text) > 2000 THEN
    RAISE EXCEPTION 'Invalid message';
  END IF;
  IF p_receiver_ids IS NULL OR cardinality(p_receiver_ids) = 0 OR cardinality(p_receiver_ids) > 100 THEN
    RAISE EXCEPTION 'Invalid recipients';
  END IF;

  FOREACH v_receiver IN ARRAY p_receiver_ids LOOP
    SELECT name INTO v_receiver_name FROM public.users WHERE uid = v_receiver;
    IF v_receiver_name IS NOT NULL THEN
      INSERT INTO public.direct_messages (
        id, sender_id, sender_name, receiver_id, receiver_name, text, is_read
      ) VALUES (
        'msg-' || replace(gen_random_uuid()::text, '-', ''),
        '00000000-0000-4000-8000-000000000001',
        'المساعد كوزمو',
        v_receiver,
        v_receiver_name,
        trim(p_text),
        false
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Policies are recreated from their live definitions while turning auth.uid()
-- into an initialization-plan expression. This preserves roles, operation modes,
-- permissiveness, and existing ownership logic.
DO $$
DECLARE
  rec RECORD;
  v_roles TEXT;
  v_command TEXT;
  v_mode TEXT;
  v_qual TEXT;
  v_with_check TEXT;
BEGIN
  FOR rec IN
    SELECT
      p.polname,
      p.polrelid,
      p.polcmd,
      p.polpermissive,
      p.polroles,
      c.relname AS table_name,
      pg_get_expr(p.polqual, p.polrelid) AS qual,
      pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'ai_performance_logs', 'daily_gift_claims', 'mystery_box_claims',
        'brain_challenge_attempts', 'referrals', 'weekly_achievements',
        'user_sessions', 'group_challenges', 'cosmo_messages',
        'daily_quiz_user_slots', 'direct_messages', 'community_posts'
      )
      AND (
        COALESCE(pg_get_expr(p.polqual, p.polrelid), '') LIKE '%auth.uid()%' OR
        COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') LIKE '%auth.uid()%'
      )
  LOOP
    SELECT string_agg(
      CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(role_oid)) END,
      ', '
    )
    INTO v_roles
    FROM unnest(rec.polroles) AS roles(role_oid);

    v_command := CASE rec.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      ELSE 'ALL'
    END;
    v_mode := CASE WHEN rec.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;
    v_qual := replace(COALESCE(rec.qual, ''), 'auth.uid()', '(select auth.uid())');
    v_with_check := replace(COALESCE(rec.with_check, ''), 'auth.uid()', '(select auth.uid())');

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.polname, rec.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s',
      rec.polname,
      rec.table_name,
      v_mode,
      v_command,
      COALESCE(v_roles, 'PUBLIC'),
      CASE WHEN v_qual = '' THEN '' ELSE ' USING (' || v_qual || ')' END,
      CASE WHEN v_with_check = '' THEN '' ELSE ' WITH CHECK (' || v_with_check || ')' END
    );
  END LOOP;
END;
$$;

-- All public SECURITY DEFINER RPCs require a signed-in user. Existing function-
-- level checks (for example, is_admin validation) continue to govern privileged actions.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      rec.schema_name,
      rec.function_name,
      rec.identity_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
      rec.schema_name,
      rec.function_name,
      rec.identity_args
    );
  END LOOP;
END;
$$;

-- Superseded legacy RPCs either trust client-controlled inputs or mutate shared
-- daily slots. They have no active client call-sites and remain unavailable.
REVOKE ALL ON FUNCTION public.add_referral(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_brain_challenge(BOOLEAN) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_referral_reward(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_weekly_achievement() FROM authenticated;
REVOKE ALL ON FUNCTION public.spin_lucky_wheel() FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_daily_quiz_refresh(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.finalize_daily_quiz_refresh(TEXT, TEXT) FROM authenticated;

-- Remove mutable search paths from all functions reported by the advisor, while
-- keeping app-schema helpers able to reference both app and public objects.
DO $$
DECLARE
  rec RECORD;
  v_path TEXT;
BEGIN
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'app')
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  LOOP
    v_path := CASE WHEN rec.schema_name = 'app' THEN 'app, public' ELSE 'public' END;
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = %s',
      rec.schema_name,
      rec.function_name,
      rec.identity_args,
      v_path
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
