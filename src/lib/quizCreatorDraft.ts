import { getOrCreateGuestIdentity } from './guestIdentity';
import type { Question } from '../types';

const EXTRACTED_DRAFT_VERSION = 1;
const EXTRACTED_DRAFT_PREFIX = 'quiz_creator_extracted_draft_v1_';
const MANUAL_DRAFT_PREFIX = 'quiz_creator_draft_';

type DraftLanguage = 'ar' | 'en';
export type ExtractedDraftFileType = 'image' | 'pdf' | 'document';

export interface ExtractedQuizDraft {
  version: typeof EXTRACTED_DRAFT_VERSION;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  timeLimit: number;
  questions: Question[];
  fileName: string;
  fileType: ExtractedDraftFileType;
  savedAt: number;
}

function normalizeOwnerId(ownerId: string): string {
  return ownerId.trim() || 'anonymous';
}

export function getQuizCreatorDraftOwnerId(userId: string, lang: DraftLanguage = 'ar'): string {
  const normalizedUserId = userId.trim();
  if (normalizedUserId) return normalizedUserId;
  return getOrCreateGuestIdentity(lang).id;
}

export function getQuizCreatorDraftKey(ownerId: string): string {
  return `${MANUAL_DRAFT_PREFIX}${encodeURIComponent(normalizeOwnerId(ownerId))}`;
}

export function getExtractedQuizDraftKey(ownerId: string): string {
  return `${EXTRACTED_DRAFT_PREFIX}${encodeURIComponent(normalizeOwnerId(ownerId))}`;
}

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== 'object') return false;
  const question = value as Partial<Question>;
  return typeof question.text === 'string'
    && Array.isArray(question.options)
    && question.options.every(option => typeof option === 'string')
    && typeof question.type === 'string';
}

function isExtractedDraft(value: unknown, ownerId: string): value is ExtractedQuizDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<ExtractedQuizDraft>;
  return draft.version === EXTRACTED_DRAFT_VERSION
    && draft.ownerId === normalizeOwnerId(ownerId)
    && typeof draft.title === 'string'
    && typeof draft.description === 'string'
    && typeof draft.category === 'string'
    && typeof draft.timeLimit === 'number'
    && Array.isArray(draft.questions)
    && draft.questions.length > 0
    && draft.questions.every(isQuestion)
    && typeof draft.fileName === 'string'
    && ['image', 'pdf', 'document'].includes(draft.fileType || '')
    && typeof draft.savedAt === 'number';
}

export function saveExtractedQuizDraft(input: Omit<ExtractedQuizDraft, 'version' | 'ownerId' | 'savedAt'> & { ownerId: string; savedAt?: number }): boolean {
  if (typeof window === 'undefined') return false;
  const ownerId = normalizeOwnerId(input.ownerId);
  const draft: ExtractedQuizDraft = {
    version: EXTRACTED_DRAFT_VERSION,
    ownerId,
    title: input.title,
    description: input.description,
    category: input.category,
    timeLimit: input.timeLimit,
    questions: input.questions,
    fileName: input.fileName,
    fileType: input.fileType,
    savedAt: input.savedAt || Date.now(),
  };

  try {
    window.localStorage.setItem(getExtractedQuizDraftKey(ownerId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function loadExtractedQuizDraft(ownerId: string): ExtractedQuizDraft | null {
  if (typeof window === 'undefined') return null;
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  try {
    const raw = window.localStorage.getItem(getExtractedQuizDraftKey(normalizedOwnerId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isExtractedDraft(parsed, normalizedOwnerId) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearExtractedQuizDraft(ownerId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getExtractedQuizDraftKey(ownerId));
  } catch {
    // Ignore storage restrictions; the in-memory flow remains usable.
  }
}
