CREATE OR REPLACE FUNCTION public.sync_quiz_total_plays()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_quiz_id TEXT := COALESCE(NEW.quiz_id, OLD.quiz_id);
BEGIN
  UPDATE public.quizzes
     SET total_plays = (
       SELECT COUNT(*)::INTEGER
       FROM public.completions
       WHERE quiz_id = target_quiz_id
     )
   WHERE id = target_quiz_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS completions_sync_quiz_total_plays ON public.completions;

CREATE TRIGGER completions_sync_quiz_total_plays
AFTER INSERT OR DELETE ON public.completions
FOR EACH ROW
EXECUTE FUNCTION public.sync_quiz_total_plays();

UPDATE public.quizzes q
   SET total_plays = (
     SELECT COUNT(*)::INTEGER
     FROM public.completions c
     WHERE c.quiz_id = q.id
   );
