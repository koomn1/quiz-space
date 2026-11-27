import { describe, expect, it, vi } from 'vitest';
import { chooseVoice, createSpeechSynthesisEngine, detectGender, genderForStep, sentenceAtProgress, splitSentences, type VoiceOption } from './narration';

const v = (name: string, lang: string, local = true): VoiceOption => ({ id: name, name, lang, gender: detectGender(name), local });

describe('narration helpers', () => {
  it('detects gender from common voice names', () => {
    expect(detectGender('Microsoft Hoda Online (Natural) - Arabic (Egypt)')).toBe('female');
    expect(detectGender('Microsoft Shakir Online (Natural) - Arabic (Egypt)')).toBe('male');
    expect(detectGender('Microsoft Zira - English (United States)')).toBe('female');
    expect(detectGender('Microsoft David - English (United States)')).toBe('male');
    expect(detectGender('Google العربية')).toBe('unknown');
  });
  it('prefers a matching gender, then local, and never picks another language', () => {
    const list = [v('Hoda', 'ar-EG', false), v('Shakir', 'ar-EG'), v('Zira', 'en-US')];
    expect(chooseVoice(list, 'ar', 'male')?.name).toBe('Shakir');
    expect(chooseVoice(list, 'ar', 'female')?.name).toBe('Hoda');
    expect(chooseVoice([v('Zira', 'en-US')], 'ar', 'male')).toBeNull();
    expect(chooseVoice(list, 'ar', 'male', 'Hoda')?.name).toBe('Hoda');
  });
  it('alternates narrators by step', () => {
    expect([0, 1, 2].map(i => genderForStep('alternate', i))).toEqual(['female', 'male', 'female']);
    expect(genderForStep('male', 3)).toBe('male');
  });
  it('splits sentences and maps progress to a sentence', () => {
    const s = splitSentences('الكسر جزء من كل. ما هو البسط؟ هذا هو المقام!');
    expect(s).toHaveLength(3);
    expect(sentenceAtProgress(s, 0)).toBe(0);
    expect(sentenceAtProgress(s, 0.99)).toBe(2);
  });
});

function fakeSynth(voices: any[]) {
  const spoken: string[] = [];
  let current: any = null;
  const synth: any = {
    getVoices: () => voices,
    speak: (u: any) => { spoken.push(u.text); current = u; },
    cancel: vi.fn(() => { current = null; }),
  };
  return { synth, spoken, finish: () => { const u = current; current = null; u?.onend?.(); } };
}

describe('speech synthesis engine', () => {
  class FakeUtterance { text: string; voice: any; lang = ''; pitch = 1; rate = 1; onend: any; onerror: any; constructor(t: string) { this.text = t; } }
  (globalThis as any).SpeechSynthesisUtterance = FakeUtterance;
  const voices = [{ name: 'Hoda', lang: 'ar-EG', voiceURI: 'Hoda', localService: true }];

  it('speaks sentence by sentence, can start mid-lesson and stops cleanly on cancel', () => {
    const f = fakeSynth(voices);
    const engine = createSpeechSynthesisEngine(() => f.synth);
    const onEnd = vi.fn();
    engine.speak({ text: 'جملة أولى. جملة ثانية. جملة ثالثة.', lang: 'ar', rate: 1, gender: 'female', fromSentence: 1, onEnd });
    expect(f.spoken).toEqual(['جملة ثانية.']);
    f.finish();
    expect(f.spoken).toEqual(['جملة ثانية.', 'جملة ثالثة.']);
    engine.cancel();
    f.finish();
    expect(onEnd).not.toHaveBeenCalled();
    expect(f.synth.cancel).toHaveBeenCalled();
  });
  it('reports no voice instead of throwing', () => {
    const f = fakeSynth([]);
    const onEnd = vi.fn();
    createSpeechSynthesisEngine(() => f.synth).speak({ text: 'x', lang: 'ar', rate: 1, gender: 'male', onEnd });
    expect(onEnd).toHaveBeenCalledWith(false);
  });
});
