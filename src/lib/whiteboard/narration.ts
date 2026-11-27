/** Thin wrapper over the browser speech engine so the player works (silently) when no voice exists. */
export interface NarrationSupport {
  supported: boolean;
  hasVoiceForLang: boolean;
}

const synth = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

export function pickVoice(lang: 'ar' | 'en'): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices();
  const prefix = lang === 'ar' ? 'ar' : 'en';
  return voices.find(v => v.lang.toLowerCase().startsWith(prefix) && v.localService) || voices.find(v => v.lang.toLowerCase().startsWith(prefix)) || null;
}

export function getNarrationSupport(lang: 'ar' | 'en'): NarrationSupport {
  const s = synth();
  if (!s) return { supported: false, hasVoiceForLang: false };
  return { supported: true, hasVoiceForLang: pickVoice(lang) !== null };
}

export function cancelNarration() {
  synth()?.cancel();
}

/** Speaks text; resolves true when it finished and false on error/cancel/no voice. */
export function speak(text: string, lang: 'ar' | 'en', rate: number, onEnd: (finished: boolean) => void): () => void {
  const s = synth();
  const voice = pickVoice(lang);
  if (!s || !voice) { onEnd(false); return () => undefined; }
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = Math.min(2, Math.max(0.5, rate));
  let settled = false;
  const done = (ok: boolean) => { if (!settled) { settled = true; onEnd(ok); } };
  u.onend = () => done(true);
  u.onerror = () => done(false);
  s.speak(u);
  return () => { settled = true; s.cancel(); };
}
