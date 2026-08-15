import { afterEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

vi.mock('../../worker/src/documentExtraction', () => ({
  extractPdfTextContent: vi.fn(async () => 'Gravity keeps planets in orbit around the sun.'),
  extractQuestionsFromText: vi.fn(),
}));

import { extractJobQuiz, type ExtractionJobRow } from '../../worker/src/extractionJobs';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('text PDF generation in extraction jobs', () => {
  it('uses the text-generation route instead of a vision file payload', async () => {
    let requestBody: BodyInit | null | undefined;
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = init?.body;
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          title: 'Solar-system review',
          description: 'Generated from PDF text.',
          questions: [{ number: 1, text: 'What keeps planets in orbit?', type: 'mcq', options: ['Gravity', 'Wind'], correctIndex: 0, correctAnswer: 'Gravity', explanation: '' }],
        }) } }],
      }), { status: 200 });
    }) as typeof fetch;

    const pdf = await PDFDocument.create();
    pdf.addPage();
    const job = {
      id: '00000000-0000-0000-0000-000000000011',
      user_id: '00000000-0000-0000-0000-000000000012',
      idempotency_key: 'pdf-text-generation-key',
      file_storage_path: '00000000-0000-0000-0000-000000000012/test/source.pdf',
      file_mime_type: 'application/pdf',
      extraction_mode: 'generate',
      custom_instruction: null,
      requested_question_count: 3,
    } as ExtractionJobRow;

    const result = await extractJobQuiz(
      new Uint8Array(await pdf.save()),
      job,
      { OPENROUTER_API_KEY: 'test-key', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' },
      vi.fn(),
    );

    const request = JSON.parse(String(requestBody));
    expect(request.messages[0].content).toContain('محتوى الملف المصدر');
    expect(request.messages[0].content).toContain('Gravity keeps planets in orbit');
    expect(JSON.stringify(request.messages[0].content)).not.toContain('file_data');
    expect(result.provider).toBe('openai/gpt-oss-20b:free');
    expect(result.questions).toHaveLength(1);
  });
});
