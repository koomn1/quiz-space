import { PDFDocument } from 'pdf-lib';

async function logAiPerformance(env: Env, authHeader: string, data: {
  user_id: string,
  operation: string,
  provider: string,
  model?: string,
  chunk_count?: number,
  total_pages?: number,
  status: 'success' | 'error',
  latency_ms: number,
  error_message?: string
}) {
  if (env.SUPABASE_URL.includes('placeholder')) return;
  try {
    await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_performance_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': authHeader
      },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error('Logging failed', e);
  }
}

export interface Env {
  OPENROUTER_API_KEY: string;
  OPENAI_API_KEY: string;
  GROQ_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGIN: string;
}

const OPENROUTER_VISION_FALLBACKS = ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', 'google/gemma-4-26b-a4b-it:free'];

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```json\s*|^```|```$/gim, '').trim();
  return JSON.parse(cleaned);
}

async function callOpenRouterWithFallback(env: Env, messages: any[], models: string[]): Promise<string> {
  let lastError: any = null;
  for (const model of models) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://quizspace.app',
          'X-Title': 'QuizSpace',
        },
        body: JSON.stringify({ model, messages }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d: any = await r.json();
      return d.choices?.[0]?.message?.content || '';
    } catch (err) {
      lastError = err;
      console.warn(`OpenRouter model ${model} failed, trying next:`, err);
    }
  }
  throw lastError || new Error('All OpenRouter models failed');
}

export async function handleStreamingExtraction(
  fileBase64: string,
  mimeType: string,
  customInstruction: string | undefined,
  env: Env,
  userId: string,
  authHeader: string,
  startTime: number
): Promise<Response> {
  const encoder = new TextEncoder();
  const isPdf = mimeType === 'application/pdf';

  if (!isPdf) {
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Streaming only supported for PDF extraction' })}\n\n`),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const losslessPrompt = `You are a lossless document extraction engine.
Extract EVERY question exactly as written.

Rules:
- Do not summarize or rewrite.
- Do not skip any question, including multiple choice, true/false, and essay/short answer questions.
- Preserve numbering and options (A/B/C/D) exactly.
- If a question starts on one page and continues on the next, merge it into one complete question.
- For Essay/Short answer questions, use type "essay" and leave options as an empty array [].
- Return JSON only in the following format:
{
  "title": "Quiz Title",
  "description": "Quiz Description",
  "questions": [
    {
      "number": 1,
      "text": "Question text...",
      "type": "mcq", // "mcq" | "tf" | "essay"
      "options": ["Option 1", "Option 2", ...], // empty array for essay
      "correctIndex": 0, // index of correct option, 0 for essay
      "correctAnswer": "The correct answer text",
      "explanation": "Brief explanation"
    }
  ]
}
${customInstruction ? `Additional instructions: ${customInstruction.slice(0, 1000)}` : ''}`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const fileData = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
        const pdfDoc = await PDFDocument.load(fileData);
        const pageCount = pdfDoc.getPageCount();
        // Five pages per request reduces model round-trips while keeping each
        // vision payload small enough for reliable extraction. Three requests
        // are processed concurrently to avoid making long PDFs wait serially.
        const chunkSize = 5;
        const chunks: string[] = [];

        // Create chunks
        for (let i = 0; i < pageCount; i += chunkSize) {
          const newDoc = await PDFDocument.create();
          const end = Math.min(i + chunkSize, pageCount);
          const pages = await newDoc.copyPages(pdfDoc, Array.from({ length: end - i }, (_, k) => i + k));
          pages.forEach(p => newDoc.addPage(p));
          const pdfBytes = await newDoc.save();
          let binary = '';
          const bytes = new Uint8Array(pdfBytes);
          for (let j = 0; j < bytes.byteLength; j++) binary += String.fromCharCode(bytes[j]);
          chunks.push(btoa(binary));
        }

        // Send initial metadata
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'init', totalChunks: chunks.length, totalPages: pageCount })}\n\n`)
        );

        // Process three chunks in parallel. Results are appended in batch order
        // so question numbering remains stable while the user gets frequent
        // progress updates instead of waiting for the whole batch.
        const allQuestions: any[] = [];
        let processedChunks = 0;
        const CONCURRENCY = 3;

        for (let start = 0; start < chunks.length; start += CONCURRENCY) {
          const batch = chunks.slice(start, start + CONCURRENCY);
          const batchResults = await Promise.all(batch.map(async (chunkBase64, offset) => {
            const chunkIndex = start + offset;
            try {
              const text = await callOpenRouterWithFallback(
                env,
                [
                  {
                    role: 'user',
                    content: [
                      { type: 'text', text: losslessPrompt },
                      { type: 'file', file: { filename: `chunk_${chunkIndex}.pdf`, file_data: `data:application/pdf;base64,${chunkBase64}` } },
                    ],
                  },
                ],
                OPENROUTER_VISION_FALLBACKS
              );
              return { result: extractJson(text) as any, chunkIndex };
            } catch (error) {
              console.error(`Chunk ${chunkIndex} failed:`, error);
              return { result: { questions: [], error: String(error) }, chunkIndex };
            }
          }));

          for (const { result, chunkIndex } of batchResults) {
            if (result?.questions && Array.isArray(result.questions)) {
              allQuestions.push(...result.questions);
            }
            processedChunks++;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'progress',
                  processed: processedChunks,
                  total: chunks.length,
                  questionsExtracted: allQuestions.length,
                  percentage: Math.round((processedChunks / chunks.length) * 100),
                  ...(result?.error ? { warning: `Chunk ${chunkIndex} failed but continuing` } : {}),
                })}\n\n`
              )
            );
          }
        }

        // Send final result
        const finalQuiz = {
          title: 'Extracted Quiz',
          description: '',
          questions: allQuestions,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', quiz: finalQuiz })}\n\n`));

        // Log performance
        await logAiPerformance(env, authHeader, {
          user_id: userId,
          operation: 'extraction_streaming',
          provider: 'openrouter',
          chunk_count: chunks.length,
          total_pages: pageCount,
          status: 'success',
          latency_ms: Date.now() - startTime
        });

        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`));
        
        await logAiPerformance(env, authHeader, {
          user_id: userId,
          operation: 'extraction_streaming',
          provider: 'openrouter',
          status: 'error',
          latency_ms: Date.now() - startTime,
          error_message: String(error)
        });

        controller.close();
      }
    },
  });

  const allowedOrigins = env.ALLOWED_ORIGIN.split(',').map(v => v.trim());
  const responseHeaders: HeadersInit = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
  };

  return new Response(stream, { headers: responseHeaders });
}
