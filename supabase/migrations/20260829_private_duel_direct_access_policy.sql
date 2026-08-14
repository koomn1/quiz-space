-- Private duel records are intentionally available only through SECURITY DEFINER RPCs.
-- Explicit false policies retain RLS default-deny behavior while documenting the boundary.
CREATE POLICY "knowledge_duel_question_bank_direct_access_denied" ON public.knowledge_duel_question_bank
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "knowledge_duels_direct_access_denied" ON public.knowledge_duels
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "knowledge_duel_participants_direct_access_denied" ON public.knowledge_duel_participants
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "knowledge_duel_rounds_direct_access_denied" ON public.knowledge_duel_rounds
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "knowledge_duel_answers_direct_access_denied" ON public.knowledge_duel_answers
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
