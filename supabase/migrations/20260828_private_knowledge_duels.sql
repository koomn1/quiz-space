-- Private, opt-in knowledge duels. There is no public leaderboard and answers stay server-side.

CREATE TABLE IF NOT EXISTS public.knowledge_duel_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL CHECK (topic IN ('math')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic')),
  prompt_ar TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
  normalized_answer TEXT NOT NULL CHECK (char_length(normalized_answer) BETWEEN 1 AND 40),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT NOT NULL UNIQUE CHECK (invite_code ~ '^[A-Z0-9]{8}$'),
  creator_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  topic TEXT NOT NULL CHECK (topic IN ('math')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'expired', 'cancelled')),
  question_count SMALLINT NOT NULL DEFAULT 5 CHECK (question_count BETWEEN 3 AND 5),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_duel_participants (
  duel_id UUID NOT NULL REFERENCES public.knowledge_duels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  seat SMALLINT NOT NULL CHECK (seat IN (1, 2)),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (duel_id, user_id),
  UNIQUE (duel_id, seat)
);

CREATE TABLE IF NOT EXISTS public.knowledge_duel_rounds (
  duel_id UUID NOT NULL REFERENCES public.knowledge_duels(id) ON DELETE CASCADE,
  sequence SMALLINT NOT NULL CHECK (sequence BETWEEN 1 AND 5),
  question_id UUID NOT NULL REFERENCES public.knowledge_duel_question_bank(id) ON DELETE RESTRICT,
  PRIMARY KEY (duel_id, sequence),
  UNIQUE (duel_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.knowledge_duel_answers (
  duel_id UUID NOT NULL REFERENCES public.knowledge_duels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  sequence SMALLINT NOT NULL CHECK (sequence BETWEEN 1 AND 5),
  answer TEXT NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 100),
  is_correct BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (duel_id, user_id, sequence)
);

CREATE INDEX IF NOT EXISTS knowledge_duels_creator_created_idx ON public.knowledge_duels(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_duel_participants_user_idx ON public.knowledge_duel_participants(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_duel_answers_user_idx ON public.knowledge_duel_answers(user_id, submitted_at DESC);

ALTER TABLE public.knowledge_duel_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_duel_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_duel_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_duel_answers ENABLE ROW LEVEL SECURITY;

INSERT INTO public.knowledge_duel_question_bank(topic, difficulty, prompt_ar, prompt_en, options, normalized_answer)
VALUES
  ('math', 'basic', 'ما ناتج 8 × 7؟', 'What is 8 × 7?', '["48","54","56","64"]'::jsonb, '56'),
  ('math', 'basic', 'ما الجذر التربيعي للعدد 81؟', 'What is the square root of 81?', '["7","8","9","10"]'::jsonb, '9'),
  ('math', 'basic', 'ما ناتج 144 ÷ 12؟', 'What is 144 ÷ 12?', '["10","11","12","13"]'::jsonb, '12'),
  ('math', 'basic', 'كم ضلعاً للمثلث؟', 'How many sides does a triangle have?', '["2","3","4","5"]'::jsonb, '3'),
  ('math', 'basic', 'ما ناتج 25% من 200؟', 'What is 25% of 200?', '["25","40","50","75"]'::jsonb, '50')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.expire_private_knowledge_duel(p_duel_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.knowledge_duels
  SET status = 'expired', updated_at = now()
  WHERE id = p_duel_id AND status IN ('waiting', 'active') AND expires_at <= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.create_private_knowledge_duel(p_topic TEXT DEFAULT 'math', p_difficulty TEXT DEFAULT 'basic')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_duel_id UUID;
  v_code TEXT;
  v_question_ids UUID[];
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_topic <> 'math' OR p_difficulty <> 'basic' THEN RAISE EXCEPTION 'Unsupported duel scope'; END IF;
  IF (SELECT COUNT(*) FROM public.knowledge_duels WHERE creator_id = v_user_id AND created_at >= now() - INTERVAL '24 hours') >= 3 THEN
    RAISE EXCEPTION 'Daily duel creation limit reached';
  END IF;
  SELECT ARRAY_AGG(id ORDER BY random()) INTO v_question_ids
  FROM (SELECT id FROM public.knowledge_duel_question_bank WHERE topic = p_topic AND difficulty = p_difficulty AND is_active = true ORDER BY random() LIMIT 5) q;
  IF COALESCE(array_length(v_question_ids, 1), 0) <> 5 THEN RAISE EXCEPTION 'Duel question set is unavailable'; END IF;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.knowledge_duels(invite_code, creator_id, topic, difficulty, expires_at)
  VALUES (v_code, v_user_id, p_topic, p_difficulty, now() + INTERVAL '15 minutes') RETURNING id INTO v_duel_id;
  INSERT INTO public.knowledge_duel_participants(duel_id, user_id, seat) VALUES (v_duel_id, v_user_id, 1);
  INSERT INTO public.knowledge_duel_rounds(duel_id, sequence, question_id)
  SELECT v_duel_id, ordinality::smallint, question_id FROM unnest(v_question_ids) WITH ORDINALITY AS x(question_id, ordinality);
  RETURN jsonb_build_object('duel_id', v_duel_id, 'invite_code', v_code, 'expires_at', now() + INTERVAL '15 minutes', 'status', 'waiting');
END;
$$;

CREATE OR REPLACE FUNCTION public.join_private_knowledge_duel(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_duel public.knowledge_duels%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_duel FROM public.knowledge_duels WHERE invite_code = upper(trim(COALESCE(p_invite_code, ''))) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Duel invitation was not found'; END IF;
  PERFORM public.expire_private_knowledge_duel(v_duel.id);
  SELECT * INTO v_duel FROM public.knowledge_duels WHERE id = v_duel.id FOR UPDATE;
  IF v_duel.status <> 'waiting' THEN RAISE EXCEPTION 'Duel invitation is no longer available'; END IF;
  IF v_duel.creator_id = v_user_id THEN RAISE EXCEPTION 'The creator cannot join their own duel'; END IF;
  IF EXISTS (SELECT 1 FROM public.knowledge_duel_participants WHERE duel_id = v_duel.id AND user_id = v_user_id) THEN RAISE EXCEPTION 'Already joined'; END IF;
  INSERT INTO public.knowledge_duel_participants(duel_id, user_id, seat) VALUES (v_duel.id, v_user_id, 2);
  UPDATE public.knowledge_duels SET status = 'active', updated_at = now() WHERE id = v_duel.id;
  RETURN jsonb_build_object('duel_id', v_duel.id, 'status', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_private_knowledge_duel_state(p_duel_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_duel public.knowledge_duels%ROWTYPE;
  v_answered INTEGER := 0;
  v_my_score INTEGER := 0;
  v_opponent_score INTEGER := 0;
  v_round JSONB := NULL;
  v_other_complete BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.knowledge_duel_participants WHERE duel_id = p_duel_id AND user_id = v_user_id) THEN RAISE EXCEPTION 'Not a duel participant'; END IF;
  PERFORM public.expire_private_knowledge_duel(p_duel_id);
  SELECT * INTO v_duel FROM public.knowledge_duels WHERE id = p_duel_id;
  SELECT COUNT(*)::integer, COUNT(*) FILTER (WHERE is_correct)::integer INTO v_answered, v_my_score FROM public.knowledge_duel_answers WHERE duel_id = p_duel_id AND user_id = v_user_id;
  IF v_duel.status = 'active' AND v_answered < v_duel.question_count THEN
    SELECT jsonb_build_object('sequence', r.sequence, 'prompt_ar', q.prompt_ar, 'prompt_en', q.prompt_en, 'options', q.options)
    INTO v_round FROM public.knowledge_duel_rounds r JOIN public.knowledge_duel_question_bank q ON q.id = r.question_id
    WHERE r.duel_id = p_duel_id AND r.sequence = v_answered + 1;
  END IF;
  IF v_duel.status = 'completed' THEN
    SELECT COUNT(*) FILTER (WHERE a.is_correct)::integer INTO v_opponent_score
    FROM public.knowledge_duel_answers a WHERE a.duel_id = p_duel_id AND a.user_id <> v_user_id;
  ELSE
    SELECT EXISTS(SELECT 1 FROM public.knowledge_duel_participants WHERE duel_id = p_duel_id AND user_id <> v_user_id AND completed_at IS NOT NULL) INTO v_other_complete;
  END IF;
  RETURN jsonb_build_object('status', v_duel.status, 'topic', v_duel.topic, 'difficulty', v_duel.difficulty, 'expires_at', v_duel.expires_at, 'question_count', v_duel.question_count, 'answered_count', v_answered, 'round', v_round, 'opponent_finished', v_other_complete, 'result', CASE WHEN v_duel.status = 'completed' THEN jsonb_build_object('my_score', v_my_score, 'opponent_score', v_opponent_score, 'outcome', CASE WHEN v_my_score > v_opponent_score THEN 'win' WHEN v_my_score = v_opponent_score THEN 'tie' ELSE 'loss' END) ELSE NULL END);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_private_knowledge_duel_answer(p_duel_id UUID, p_sequence SMALLINT, p_answer TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_duel public.knowledge_duels%ROWTYPE;
  v_correct TEXT;
  v_answered INTEGER := 0;
  v_complete_count INTEGER := 0;
  v_is_correct BOOLEAN;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(COALESCE(p_answer, ''))) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid answer'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.knowledge_duel_participants WHERE duel_id = p_duel_id AND user_id = v_user_id) THEN RAISE EXCEPTION 'Not a duel participant'; END IF;
  PERFORM public.expire_private_knowledge_duel(p_duel_id);
  SELECT * INTO v_duel FROM public.knowledge_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND OR v_duel.status <> 'active' THEN RAISE EXCEPTION 'Duel is not active'; END IF;
  SELECT COUNT(*)::integer INTO v_answered FROM public.knowledge_duel_answers WHERE duel_id = p_duel_id AND user_id = v_user_id;
  IF p_sequence <> v_answered + 1 OR p_sequence > v_duel.question_count THEN RAISE EXCEPTION 'Answer sequence is not available'; END IF;
  SELECT q.normalized_answer INTO v_correct FROM public.knowledge_duel_rounds r JOIN public.knowledge_duel_question_bank q ON q.id = r.question_id WHERE r.duel_id = p_duel_id AND r.sequence = p_sequence;
  IF v_correct IS NULL THEN RAISE EXCEPTION 'Question is not available'; END IF;
  v_is_correct := lower(trim(p_answer)) = lower(trim(v_correct));
  INSERT INTO public.knowledge_duel_answers(duel_id, user_id, sequence, answer, is_correct) VALUES (p_duel_id, v_user_id, p_sequence, trim(p_answer), v_is_correct);
  IF p_sequence = v_duel.question_count THEN UPDATE public.knowledge_duel_participants SET completed_at = now() WHERE duel_id = p_duel_id AND user_id = v_user_id; END IF;
  SELECT COUNT(*)::integer INTO v_complete_count FROM public.knowledge_duel_participants WHERE duel_id = p_duel_id AND completed_at IS NOT NULL;
  IF v_complete_count = 2 THEN UPDATE public.knowledge_duels SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = p_duel_id; END IF;
  RETURN jsonb_build_object('accepted', true, 'answered_count', p_sequence, 'completed', v_complete_count = 2);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_private_knowledge_duel(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_private_knowledge_duel(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_private_knowledge_duel(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_private_knowledge_duel_state(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_private_knowledge_duel_answer(UUID, SMALLINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_private_knowledge_duel(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_private_knowledge_duel(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_private_knowledge_duel_state(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_private_knowledge_duel_answer(UUID, SMALLINT, TEXT) TO authenticated;
