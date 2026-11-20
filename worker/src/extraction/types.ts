import type { ExtractionJobRow } from '../types';

export type { ExtractionJobRow };

export interface ExtractionJobEnv {
  INCEPTION_API_KEY?: string;
  XKIRO_API_KEY?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface ExtractionJobChunkRow {
  id: string;
  parent_job_id: string;
  chunk_index: number;
  page_start: number;
  page_end: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  processing_token: string | null;
  processing_lease_expires_at: string | null;
  questions_json: unknown[] | null;
  provider: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreateExtractionJobInput {
  idempotencyKey: string;
  fileStoragePath: string;
  mimeType: string;
  sourceFileName?: string;
  extractionMode: 'literal' | 'generate';
  customInstruction?: string;
  requestedQuestionCount?: number;
}

export type ExtractionJobControl = 'pause' | 'resume' | 'cancel' | 'retry-failed';

export interface VisionChunkPlan {
  pageCountPerChunk: number;
  concurrency: number;
  estimatedChunkCount: number;
  reason: 'standard' | 'large-document' | 'raster-heavy';
}

export type AllowedQuestionType = 'mcq' | 'tf' | 'essay';
