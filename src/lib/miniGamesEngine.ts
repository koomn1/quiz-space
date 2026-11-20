import { MiniGameId, MiniGameSession, WordMatrixPuzzleData } from '../types';

export const WORD_MATRIX_TOPICS = ['علوم', 'لغة', 'تقنية', 'فضاء', 'ثقافة عامة'] as const;
export type WordMatrixTopic = (typeof WORD_MATRIX_TOPICS)[number];

export interface WordMatrixBankItem {
  id: string;
  topic: string;
  topicAr: WordMatrixTopic;
  targetWords: string[];
  letters: string[];
}

/**
 * Curated bank of educational Arabic word matrix puzzles.
 * Each puzzle has letters that form all target words.
 */
export const WORD_MATRIX_PUZZLE_BANK: WordMatrixBankItem[] = [
  {
    id: 'wm_science_1',
    topic: 'science',
    topicAr: 'علوم',
    targetWords: ['طاقة', 'خلية', 'ذرة'],
    letters: ['ط', 'ا', 'ق', 'ة', 'خ', 'ل', 'ي', 'ذ', 'ر'],
  },
  {
    id: 'wm_science_2',
    topic: 'science',
    topicAr: 'علوم',
    targetWords: ['ضوء', 'مادة', 'عنصر'],
    letters: ['ض', 'و', 'ء', 'م', 'ا', 'د', 'ة', 'ع', 'ن', 'ص', 'ر'],
  },
  {
    id: 'wm_lang_1',
    topic: 'language',
    topicAr: 'لغة',
    targetWords: ['بلاغة', 'نحو', 'بيان'],
    letters: ['ب', 'ل', 'ا', 'غ', 'ة', 'ن', 'ح', 'و', 'ي'],
  },
  {
    id: 'wm_lang_2',
    topic: 'language',
    topicAr: 'لغة',
    targetWords: ['معجم', 'قصيد', 'حرف'],
    letters: ['م', 'ع', 'ج', 'ق', 'ص', 'ي', 'د', 'ح', 'ر', 'ف'],
  },
  {
    id: 'wm_tech_1',
    topic: 'technology',
    topicAr: 'تقنية',
    targetWords: ['كود', 'سحابة', 'شبكة'],
    letters: ['ك', 'و', 'د', 'س', 'ح', 'ا', 'ب', 'ة', 'ش'],
  },
  {
    id: 'wm_tech_2',
    topic: 'technology',
    topicAr: 'تقنية',
    targetWords: ['ذكاء', 'روبوت', 'بيان'],
    letters: ['ذ', 'ك', 'ا', 'ء', 'ر', 'و', 'ب', 'ت', 'ي', 'ن'],
  },
  {
    id: 'wm_space_1',
    topic: 'space',
    topicAr: 'فضاء',
    targetWords: ['قمر', 'كوكب', 'نجم', 'مدار'],
    letters: ['ق', 'م', 'ر', 'ك', 'و', 'ب', 'ن', 'ج', 'د', 'ا'],
  },
  {
    id: 'wm_space_2',
    topic: 'space',
    topicAr: 'فضاء',
    targetWords: ['مجرة', 'نيزك', 'شمس'],
    letters: ['م', 'ج', 'ر', 'ة', 'ن', 'ي', 'ز', 'ك', 'ش', 'س'],
  },
  {
    id: 'wm_culture_1',
    topic: 'general_knowledge',
    topicAr: 'ثقافة عامة',
    targetWords: ['حكمة', 'معرفة', 'كتاب'],
    letters: ['ح', 'ك', 'م', 'ة', 'ع', 'ر', 'ف', 'ت', 'ا', 'ب'],
  },
  {
    id: 'wm_culture_2',
    topic: 'general_knowledge',
    topicAr: 'ثقافة عامة',
    targetWords: ['تاريخ', 'سلام', 'تراث'],
    letters: ['ت', 'ا', 'ر', 'ي', 'خ', 'س', 'ل', 'م', 'ث'],
  },
];

/**
 * Computes deterministic integer hash from a date string (e.g. YYYY-MM-DD).
 */
export function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministically shuffles an array using a numeric seed.
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;
  for (let i = result.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const rnd = currentSeed / 233280;
    const j = Math.floor(rnd * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Returns deterministic daily Word Matrix puzzle for a given date (defaults to today).
 */
export function getDailyWordMatrix(dateString?: string): WordMatrixPuzzleData {
  const dateKey = dateString || new Date().toISOString().split('T')[0];
  const seed = hashDateString(dateKey);
  const puzzleIndex = seed % WORD_MATRIX_PUZZLE_BANK.length;
  const basePuzzle = WORD_MATRIX_PUZZLE_BANK[puzzleIndex];

  // Deterministically shuffle letters for variety while keeping letter pool reproducible
  const shuffledLetters = seededShuffle(basePuzzle.letters, seed);

  return {
    id: `${basePuzzle.id}_${dateKey}`,
    topic: basePuzzle.topic,
    topicAr: basePuzzle.topicAr,
    letters: shuffledLetters,
    targetWords: [...basePuzzle.targetWords],
  };
}

/**
 * Verifies if an ordered sequence of selected letter nodes matches a target word.
 */
export function verifyWordSolution(selectedLetters: string[], targetWord: string): boolean {
  if (!selectedLetters || !targetWord) return false;
  const candidate = selectedLetters.join('').trim();
  const target = targetWord.trim();
  return candidate === target;
}

/**
 * Calculates coins and XP rewards based on completion time and number of words found.
 */
export function calculatePuzzleReward(
  timeSeconds: number,
  wordsFoundCount: number,
): { coins: number; xp: number } {
  const count = Math.max(1, wordsFoundCount);
  const baseCoins = count * 6;
  const baseXp = count * 10;

  let speedBonusCoins = 0;
  let speedBonusXp = 0;

  if (timeSeconds <= 30) {
    speedBonusCoins = 7;
    speedBonusXp = 10;
  } else if (timeSeconds <= 60) {
    speedBonusCoins = 4;
    speedBonusXp = 5;
  } else if (timeSeconds <= 120) {
    speedBonusCoins = 2;
    speedBonusXp = 2;
  }

  return {
    coins: Math.max(15, baseCoins + speedBonusCoins),
    xp: Math.max(25, baseXp + speedBonusXp),
  };
}

/**
 * Daily allowances configuration per game
 */
export const DAILY_GAME_LIMITS: Record<MiniGameId, number> = {
  word_matrix: 3,
  cosmic_match: 3,
  spin_wheel: 1,
};

function getAllowanceStorageKey(userId: string, gameId: MiniGameId, dateKey: string): string {
  return `quiz_minigame_allowance_${userId}_${gameId}_${dateKey}`;
}

const inMemoryStore: Record<string, string> = {};

export function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {}

  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      const val = (globalThis as any).localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {}

  return inMemoryStore[key] ?? null;
}

export function setStorageItem(key: string, value: string): void {
  inMemoryStore[key] = value;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}

  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.setItem(key, value);
    }
  } catch {}
}

export function clearGameEngineStorage(): void {
  for (const k of Object.keys(inMemoryStore)) {
    delete inMemoryStore[k];
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  } catch {}
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.clear();
    }
  } catch {}
}

/**
 * Checks remaining daily plays for a user and game.
 */
export function getDailyGameAllowance(
  userId: string,
  gameId: MiniGameId,
): { remainingPlays: number; maxDailyPlays: number; canPlay: boolean } {
  const maxDailyPlays = DAILY_GAME_LIMITS[gameId] ?? 3;
  const today = new Date().toISOString().split('T')[0];
  const storageKey = getAllowanceStorageKey(userId, gameId, today);
  const raw = getStorageItem(storageKey);

  let playsUsed = 0;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      playsUsed = parsed;
    }
  }

  const remainingPlays = Math.max(0, maxDailyPlays - playsUsed);
  return {
    remainingPlays,
    maxDailyPlays,
    canPlay: remainingPlays > 0,
  };
}

/**
 * Records a game session, decrements remaining plays, and returns session summary.
 */
export function recordGamePlay(
  userId: string,
  gameId: MiniGameId,
  score: number,
): MiniGameSession {
  const today = new Date().toISOString().split('T')[0];
  const storageKey = getAllowanceStorageKey(userId, gameId, today);

  let playsUsed = 0;
  const raw = getStorageItem(storageKey);
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) playsUsed = parsed;
  }
  playsUsed += 1;
  setStorageItem(storageKey, playsUsed.toString());

  // Calculate rewards from score & game
  const rewardCoins = Math.max(10, Math.floor(score * 0.25));
  const rewardXp = Math.max(15, Math.floor(score * 0.4));

  const session: MiniGameSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    gameId,
    score,
    completed: true,
    rewardCoins,
    rewardXp,
  };

  const sessionsKey = `quiz_minigame_sessions_${userId}`;
  const existingRaw = getStorageItem(sessionsKey);
  const sessions = existingRaw ? JSON.parse(existingRaw) : [];
  sessions.push({ ...session, date: today, recordedAt: new Date().toISOString() });
  setStorageItem(sessionsKey, JSON.stringify(sessions));

  return session;
}

// ---------------------------------------------------------------------------
// Future Compatibility / Task 4 Helpers (Cosmic Match & Daily Spin Wheel)
// ---------------------------------------------------------------------------

export interface MemoryCard {
  id: string;
  pairId: string;
  label: string;
  icon?: string;
  matched: boolean;
}

const MEMORY_CARD_PAIRS = [
  { pairId: 'pair_1', label: 'ذرة' },
  { pairId: 'pair_2', label: 'خلية' },
  { pairId: 'pair_3', label: 'كوكب' },
  { pairId: 'pair_4', label: 'مجرة' },
  { pairId: 'pair_5', label: 'كود' },
  { pairId: 'pair_6', label: 'سحابة' },
];

/**
 * Generates 12 memory cards containing 6 matching pairs.
 */
export function generateMemoryCards(): MemoryCard[] {
  const cards: MemoryCard[] = [];
  MEMORY_CARD_PAIRS.forEach((item, index) => {
    cards.push({
      id: `card_${item.pairId}_a_${index}`,
      pairId: item.pairId,
      label: item.label,
      matched: false,
    });
    cards.push({
      id: `card_${item.pairId}_b_${index}`,
      pairId: item.pairId,
      label: item.label,
      matched: false,
    });
  });

  return seededShuffle(cards, Date.now());
}

export interface SpinPrize {
  label: string;
  type: 'coins' | 'xp' | 'badge' | 'mystery';
  amount: number;
}

export const SPIN_WHEEL_SEGMENTS: SpinPrize[] = [
  { label: '+10 عملة', type: 'coins', amount: 10 },
  { label: '+25 XP', type: 'xp', amount: 25 },
  { label: '+20 عملة', type: 'coins', amount: 20 },
  { label: '+50 XP', type: 'xp', amount: 50 },
  { label: '+30 عملة', type: 'coins', amount: 30 },
  { label: '+75 XP', type: 'xp', amount: 75 },
  { label: '+50 عملة', type: 'coins', amount: 50 },
  { label: 'صندوق مفاجآت', type: 'mystery', amount: 100 },
];

/**
 * Determines server-authoritative outcome for daily lucky spin wheel.
 */
export function determineSpinOutcome(
  userId: string,
  dateString?: string,
): { segmentIndex: number; targetAngle: number; prize: SpinPrize } {
  const dateKey = dateString || new Date().toISOString().split('T')[0];
  const seed = hashDateString(`${userId}_${dateKey}_spin`);
  const segmentCount = 8;
  const segmentIndex = seed % segmentCount;
  const segmentAngle = 360 / segmentCount;

  // Add 4-6 full spins (1440 - 2160 deg) plus the center of the winning slice
  const fullRotations = 360 * 5;
  const targetAngle = fullRotations + segmentIndex * segmentAngle + segmentAngle / 2;

  return {
    segmentIndex,
    targetAngle,
    prize: SPIN_WHEEL_SEGMENTS[segmentIndex],
  };
}
