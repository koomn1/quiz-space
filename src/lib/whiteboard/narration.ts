/**
 * Narration layer for the whiteboard player.
 * `NarrationEngine` is the seam: the browser speechSynthesis engine below is the only implementation today,
 * a server TTS engine (a Worker route returning audio) can implement the same interface later.
 */
export type NarrationLang = 'ar' | 'en';
export type VoiceGender = 'female' | 'male' | 'unknown';
export type VoicePreference = 'female' | 'male' | 'alternate';

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: VoiceGender;
  local: boolean;
}

export interface NarrationSupport {
  supported: boolean;
  hasVoiceForLang: boolean;
}

export interface SpeakRequest {
  text: string;
  lang: NarrationLang;
  rate: number;
  /** Which narrator to use; the engine picks the best matching voice and may fall back to pitch. */
  gender: Exclude<VoiceGender, 'unknown'>;
  voiceId?: string | null;
  /** Start at this sentence (used to resume cleanly after a pause). */
  fromSentence?: number;
  onSentence?: (index: number) => void;
  onEnd: (finished: boolean) => void;
}

export interface NarrationEngine {
  readonly kind: 'speech-synthesis' | 'server';
  supported(): boolean;
  voices(lang: NarrationLang): VoiceOption[];
  speak(request: SpeakRequest): () => void;
  cancel(): void;
}

const FEMALE_HINTS = /\b(female|woman|zira|hoda|salma|laila|leila|mariam|hala|zeina|noura|amira|fatima|samantha|victoria|karen|moira|tessa|susan|aria|jenny|libby|sonia|hazel|google\s+(?:us|uk)\s+english(?!.*male))\b|أنثى|هدى|سلمى|ليلى/i;
const MALE_HINTS = /\b(male|man|naayf|hamed|maged|tarik|shakir|ahmed|omar|david|mark|guy|daniel|alex|fred|george|ryan|james|thomas|brian|christopher|eric)\b|ذكر|نايف|حامد|ماجد|طارق|شاكر/i;

export function detectGender(name: string): VoiceGender {
  if (/\bfemale\b/i.test(name)) return 'female';
  if (MALE_HINTS.test(name) && !/\bfemale\b/i.test(name)) return 'male';
  if (FEMALE_HINTS.test(name)) return 'female';
  return 'unknown';
}

export function toVoiceOption(v: Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'voiceURI' | 'localService'>): VoiceOption {
  return { id: v.voiceURI || v.name, name: v.name, lang: v.lang, gender: detectGender(v.name), local: v.localService };
}

/** Picks the best voice for the language and narrator gender; exact gender match first, then local voices. */
export function chooseVoice(options: VoiceOption[], lang: NarrationLang, gender: Exclude<VoiceGender, 'unknown'>, voiceId?: string | null): VoiceOption | null {
  const forLang = options.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(lang));
  if (forLang.length === 0) return null;
  if (voiceId) { const exact = forLang.find(v => v.id === voiceId); if (exact) return exact; }
  const rank = (v: VoiceOption) => (v.gender === gender ? 0 : v.gender === 'unknown' ? 1 : 2) * 2 + (v.local ? 0 : 1);
  return [...forLang].sort((a, b) => rank(a) - rank(b))[0];
}

/** Voice for a step. Alternate mode alternates narrators by step number (female first). */
export function genderForStep(pref: VoicePreference, stepIndex: number): Exclude<VoiceGender, 'unknown'> {
  if (pref === 'alternate') return stepIndex % 2 === 0 ? 'female' : 'male';
  return pref;
}

/** Splits narration into sentences (Arabic and Latin punctuation) so speech can pause and resume at sentence starts. */
export function splitSentences(text: string): string[] {
  const parts = text.replace(/\s+/g, ' ').trim().match(/[^.!?؟۔…]+[.!?؟۔…]*/g) ?? [];
  return parts.map(p => p.trim()).filter(Boolean);
}

/** Sentence that is being spoken at `progress` (0..1) of the narration, weighted by character count. */
export function sentenceAtProgress(sentences: string[], progress: number): number {
  if (sentences.length <= 1) return 0;
  const total = sentences.reduce((n, s) => n + s.length, 0);
  let acc = 0;
  const target = Math.min(0.999, Math.max(0, progress)) * total;
  for (let i = 0; i < sentences.length; i++) {
    acc += sentences[i].length;
    if (target < acc) return i;
  }
  return sentences.length - 1;
}

const PITCH_FALLBACK = { female: 1.15, male: 0.8 } as const;

export function createSpeechSynthesisEngine(getSynth: () => SpeechSynthesis | null = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null)): NarrationEngine {
  const raw = (): SpeechSynthesisVoice[] => getSynth()?.getVoices() ?? [];
  let token = 0;
  return {
    kind: 'speech-synthesis',
    supported: () => getSynth() !== null,
    voices: lang => raw().map(toVoiceOption).filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(lang)),
    cancel() { token++; getSynth()?.cancel(); },
    speak(req) {
      const synth = getSynth();
      const all = raw();
      const chosen = chooseVoice(all.map(toVoiceOption), req.lang, req.gender, req.voiceId);
      const voice = chosen ? all.find(v => (v.voiceURI || v.name) === chosen.id) ?? null : null;
      if (!synth || !voice) { req.onEnd(false); return () => undefined; }
      const sentences = splitSentences(req.text);
      const my = ++token;
      synth.cancel();
      // Without a voice of the requested gender, a pitch shift still keeps the two narrators distinguishable.
      const pitch = chosen && chosen.gender !== req.gender ? PITCH_FALLBACK[req.gender] : 1;
      const run = (i: number) => {
        if (my !== token) return;
        if (i >= sentences.length) { req.onEnd(true); return; }
        req.onSentence?.(i);
        const u = new SpeechSynthesisUtterance(sentences[i]);
        u.voice = voice; u.lang = voice.lang; u.pitch = pitch;
        u.rate = Math.min(2, Math.max(0.5, req.rate));
        u.onend = () => run(i + 1);
        u.onerror = () => { if (my === token) req.onEnd(false); };
        synth.speak(u);
      };
      run(Math.min(Math.max(0, req.fromSentence ?? 0), Math.max(0, sentences.length - 1)));
      return () => { if (my === token) { token++; synth.cancel(); } };
    },
  };
}

export const defaultNarrationEngine: NarrationEngine = createSpeechSynthesisEngine();

export function getNarrationSupport(lang: NarrationLang, engine: NarrationEngine = defaultNarrationEngine): NarrationSupport {
  if (!engine.supported()) return { supported: false, hasVoiceForLang: false };
  return { supported: true, hasVoiceForLang: engine.voices(lang).length > 0 };
}

export function cancelNarration(engine: NarrationEngine = defaultNarrationEngine) { engine.cancel(); }

const PREF_KEY = 'quizspace.whiteboard.voice.v1';
export function loadVoicePreference(storage: Pick<Storage, 'getItem'> = localStorage): VoicePreference {
  try { const v = storage.getItem(PREF_KEY); return v === 'male' || v === 'alternate' ? v : 'female'; } catch { return 'female'; }
}
export function saveVoicePreference(pref: VoicePreference, storage: Pick<Storage, 'setItem'> = localStorage) {
  try { storage.setItem(PREF_KEY, pref); } catch { /* private mode */ }
}
