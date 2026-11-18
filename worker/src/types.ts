export interface ExtractionJobRow {
  id: string;
  user_id: string;
  idempotency_key: string;
  file_storage_path: string;
  file_mime_type: string;
  source_file_name: string | null;
  extraction_mode: 'literal' | 'generate';
  custom_instruction: string | null;
  requested_question_count: number | null;
  status: 'pending' | 'processing' | 'paused' | 'complete' | 'error' | 'cancelled';
  progress_percentage: number;
  processed_chunks: number;
  total_chunks: number | null;
  progress_message: string | null;
  questions_json: unknown[] | null;
  quiz_title: string | null;
  quiz_description: string | null;
  provider: string | null;
  error_message: string | null;
  processing_token: string | null;
  processing_lease_expires_at: string | null;
  created_at: string;
  updated_at: string;
}
