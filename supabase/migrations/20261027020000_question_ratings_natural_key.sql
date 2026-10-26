-- Prevent duplicate question ratings for the same user, quiz, and question.
-- Existing rows were checked for duplicate natural keys before this migration.
CREATE UNIQUE INDEX IF NOT EXISTS question_ratings_user_quiz_question_uidx
  ON public.question_ratings (user_id, quiz_id, question_id);
