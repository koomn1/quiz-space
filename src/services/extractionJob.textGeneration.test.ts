import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractJobQuiz, type ExtractionJobRow } from '../../worker/src/extractionJobs';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('narrative text generation in extraction jobs', () => {
  it('sends narrative text to a text model instead of a vision payload', async () => {
    let requestBody: BodyInit | null | undefined;
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = init?.body;
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          title: 'Solar-system review',
          description: 'Generated from a narrative.',
          questions: [{ number: 1, text: 'What keeps planets in orbit?', type: 'mcq', options: ['Gravity', 'Wind'], correctIndex: 0, correctAnswer: 'Gravity', explanation: '' }],
        }) } }],
      }), { status: 200 });
    });
    globalThis.fetch = fetchSpy as typeof fetch;

    const job = {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000002',
      idempotency_key: 'text-generation-test-key',
      file_storage_path: '00000000-0000-0000-0000-000000000002/test/source.txt',
      file_mime_type: 'text/plain',
      extraction_mode: 'generate',
      custom_instruction: null,
      requested_question_count: 3,
    } as ExtractionJobRow;

    const result = await extractJobQuiz(
      new TextEncoder().encode('Gravity keeps planets in orbit around the sun.'),
      job,
      { OPENROUTER_API_KEY: 'test-key', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' },
      vi.fn(),
    );

    const request = JSON.parse(String(requestBody));
    expect(request.messages[1].content).toContain('محتوى الملف المصدر');
    expect(request.messages[1].content).toContain('Gravity keeps planets in orbit');
    expect(JSON.stringify(request.messages[1].content)).not.toContain('image_url');
    expect(result.provider).toBe('nvidia/nemotron-3.5-lightning:free');
    expect(result.questions).toHaveLength(1);
  });

  it('splits large requested counts instead of sending 100 questions in one request', async () => {
    const requestBodies: any[] = [];
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          title: 'Large source quiz',
          description: 'Generated in bounded sections.',
          questions: [{ number: 1, text: `Question ${requestBodies.length}`, type: 'mcq', options: ['Correct', 'Wrong'], correctIndex: 0, correctAnswer: 'Correct', explanation: '' }],
        }) } }],
      }), { status: 200 });
    }) as typeof fetch;
    const source = 'A concept explained in the source. '.repeat(4_000);
    const job = {
      id: '00000000-0000-0000-0000-000000000003',
      user_id: '00000000-0000-0000-0000-000000000004',
      idempotency_key: 'large-count-generation-key',
      file_storage_path: '00000000-0000-0000-0000-000000000004/test/large.txt',
      file_mime_type: 'text/plain',
      extraction_mode: 'generate',
      custom_instruction: null,
      requested_question_count: 100,
    } as ExtractionJobRow;

    const result = await extractJobQuiz(
      new TextEncoder().encode(source),
      job,
      { OPENROUTER_API_KEY: 'test-key', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' },
      vi.fn(),
    );

    expect(requestBodies.length).toBeGreaterThan(1);
    expect(requestBodies.every((request) => String(request.messages[1].content).includes('محتوى الملف المصدر'))).toBe(true);
    expect(result.chunks).toBe(requestBodies.length);
  });
});
