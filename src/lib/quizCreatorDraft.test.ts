import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearExtractedQuizDraft,
  getExtractedQuizDraftKey,
  getQuizCreatorDraftKey,
  loadExtractedQuizDraft,
  saveExtractedQuizDraft,
} from './quizCreatorDraft';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const question = {
  id: 'q-1',
  type: 'mcq' as const,
  text: 'ما عاصمة مصر؟',
  options: ['القاهرة', 'الإسكندرية', 'الأقصر', 'أسوان'],
  correctIndex: 0,
  correctAnswer: 'القاهرة',
  explanation: 'إجابة اختبارية',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('quiz creator extracted drafts', () => {
  it('uses distinct keys for distinct owners', () => {
    expect(getExtractedQuizDraftKey('auth-user-a')).not.toBe(getExtractedQuizDraftKey('auth-user-b'));
    expect(getQuizCreatorDraftKey('user-guest-ABC234')).not.toBe(getQuizCreatorDraftKey('user-guest-XYZ789'));
  });

  it('restores one owner draft without exposing it to another owner', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });

    expect(saveExtractedQuizDraft({
      ownerId: 'auth-user-a',
      title: 'اختبار محفوظ',
      description: 'مسودة',
      category: 'علوم',
      timeLimit: 10,
      questions: [question],
      fileName: 'exam.pdf',
      fileType: 'pdf',
      savedAt: 123,
    })).toBe(true);

    expect(loadExtractedQuizDraft('auth-user-a')).toMatchObject({
      ownerId: 'auth-user-a',
      title: 'اختبار محفوظ',
      questions: [question],
      savedAt: 123,
    });
    expect(loadExtractedQuizDraft('auth-user-b')).toBeNull();
  });

  it('clears the extracted draft after the user declines continuation', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });

    saveExtractedQuizDraft({
      ownerId: 'user-guest-ABC234',
      title: 'اختبار ضيف',
      description: '',
      category: 'عام',
      timeLimit: 0,
      questions: [question],
      fileName: 'exam.png',
      fileType: 'image',
    });

    clearExtractedQuizDraft('user-guest-ABC234');
    expect(loadExtractedQuizDraft('user-guest-ABC234')).toBeNull();
  });

  it('rejects malformed drafts instead of restoring arbitrary data', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    storage.setItem(getExtractedQuizDraftKey('auth-user-a'), JSON.stringify({ ownerId: 'auth-user-b', questions: [question] }));

    expect(loadExtractedQuizDraft('auth-user-a')).toBeNull();
  });
});
