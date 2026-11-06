export type ExtractionProvider = 'local' | 'mercury' | 'vision' | 'hybrid';

export type QuestionConfidenceLevel = 'confirmed' | 'suspected' | 'needs_ai_review';

export type QuestionType = 'mcq' | 'true_false' | 'essay' | 'matching' | 'fill_blanks';

export type VisualCue = 'checkmark' | 'underline' | 'highlight' | 'bold' | 'answer_key' | 'explicit_text';

export interface ExtractedOption {
  letter: string;
  rawSpan: string;
  text: string;
  isCorrect?: boolean;
  visualCue?: VisualCue;
}

export interface ExtractedQuestion {
  id: string;
  rawNumber: string;
  sectionTitle?: string;
  questionType: QuestionType;
  rawSpan: string;
  stem: string;
  options: ExtractedOption[];
  correctAnswer: string | null;
  explanation?: string | null;
  sourcePages: number[];
  origin: 'local_deterministic' | 'mercury_verified' | 'mercury_recovered' | 'vision_ocr';
  status: QuestionConfidenceLevel;
  confidence: number;
  warnings: string[];
}

export interface AnswerKeyEntry {
  sectionHint?: string;
  rawNumber: string;
  answerValue: string;
  sourcePage: number;
}

export interface ExtractionResult {
  questions: ExtractedQuestion[];
  answerKeyEntries: AnswerKeyEntry[];
  warnings: string[];
  sourcePages: number[];
  provider: ExtractionProvider;
  confidence: number;
  incompleteChunks: number[];
}
