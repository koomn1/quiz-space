/** Mirrors the Worker rule: AI whiteboard lessons are for Gold and Diamond plans only. The Worker re-checks server-side. */
export function canGenerateWhiteboardLesson(isPremium: boolean | undefined, planName: string | undefined | null): boolean {
  if (!isPremium) return false;
  const p = (planName || '').toLowerCase();
  return p.includes('gold') || p.includes('diamond') || p.includes('ذهب') || p.includes('ماس');
}
