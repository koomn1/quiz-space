import { PDFDocument } from 'pdf-lib';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface Env {
  OPENROUTER_API_KEY: string;
  OPENAI_API_KEY: string;
  GROQ_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGIN: string;
}

type Provider = 'openrouter' | 'openai' | 'groq' | 'deepseek';

// Default text + vision models used when calling OpenRouter. OpenRouter is
// a single API that proxies many underlying models — change these two
// constants to switch models without touching any other code.
// NOTE: OpenRouter's free-tier catalog changes often — Meta's free Llama
// endpoints (including the ones previously used here) were delisted mid-2026.
// These are confirmed live on the free tier as of Aug 2026; double-check at
// https://openrouter.ai/models?max_price=0 if generation starts failing again.
const OPENROUTER_TEXT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
const OPENROUTER_VISION_MODEL = 'google/gemma-4-31b-it:free';
// Free models on OpenRouter get rate-limited hard during peak hours and can
// disappear without warning — if the primary model fails, try these next
// instead of just erroring out.
const OPENROUTER_TEXT_FALLBACKS = ['nvidia/nemotron-3-ultra-550b-a55b:free', 'openai/gpt-oss-20b:free', 'meta-llama/llama-3.3-70b-instruct:free'];
const OPENROUTER_VISION_FALLBACKS = ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', 'google/gemma-4-26b-a4b-it:free'];
const OPENROUTER_SITE_URL = 'https://quizspace.app';
const OPENROUTER_SITE_NAME = 'QuizSpace';

const json = (data: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
});

function cors(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN.split(',').map(value => value.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

async function getUserId(request: Request, env: Env): Promise<string | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  if (env.SUPABASE_URL.includes('placeholder')) return 'placeholder-user';
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization },
  });
  if (!response.ok) return null;
  const user = await response.json() as any;
  return user.id;
}

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

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```json\s*|^```|```$/gim, '').trim();
  return JSON.parse(cleaned);
}

function quizPrompt(topic: string, amount: number, previous: string[]): string {
  const exclusions = previous.length ? `\nلا تكرر هذه الأسئلة: ${previous.join(' | ')}` : '';
  return `أنشئ اختباراً من ${amount} سؤال عن: ${topic}.${exclusions}
نوّع أنواع الأسئلة: اختيار من متعدد (mcq) وصح/خطأ (tf) وأسئلة مقالية (essay) حسب الموضوع.
أجب بـ JSON صالح فقط وفق الشكل التالي:
{"title":"عنوان الاختبار","description":"وصف الاختبار","questions":[
  {"text":"نص السؤال","type":"mcq","options":["خيار 1","خيار 2","خيار 3","خيار 4"],"correctIndex":0,"correctAnswer":"","explanation":"الشرح العلمي"},
  {"text":"سؤال صح أو خطأ","type":"tf","options":["صح","خطأ"],"correctIndex":0,"correctAnswer":"صح","explanation":"شرح"},
  {"text":"سؤال مقالي","type":"essay","options":[],"correctIndex":0,"correctAnswer":"الإجابة النموذجية","explanation":"شرح"}
]}`;
}

async function callOpenRouter(env: Env, messages: any[], model = OPENROUTER_TEXT_MODEL, plugins?: any[]): Promise<string> {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': OPENROUTER_SITE_URL,
      'X-Title': OPENROUTER_SITE_NAME,
    },
    body: JSON.stringify({ model, messages, ...(plugins ? { plugins } : {}) }),
  });
  if (!r.ok) throw new Error(await r.text());
  const d: any = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

// Tries each model in order and returns the first success. Free OpenRouter
// models get rate-limited hard during peak hours and rotate out without
// warning, so a single hardcoded model with no fallback means the whole
// feature goes down whenever that one model has an off day.
async function callOpenRouterWithFallback(env: Env, messages: any[], models: string[], plugins?: any[]): Promise<string> {
  let lastError: any = null;
  for (const model of models) {
    try {
      return await callOpenRouter(env, messages, model, plugins);
    } catch (err) {
      lastError = err;
      console.warn(`OpenRouter model ${model} failed, trying next:`, err);
    }
  }
  throw lastError || new Error('All OpenRouter models failed');
}

async function providerText(provider: Provider, prompt: string, env: Env): Promise<string> {
  const order: Provider[] = provider === 'groq'
    ? ['groq', 'openai', 'deepseek', 'openrouter']
    : provider === 'openai'
      ? ['openai', 'deepseek', 'openrouter']
      : provider === 'deepseek'
        ? ['deepseek', 'openrouter']
        : ['openrouter'];
  let lastError: any;
  for (const current of order) {
    try {
      if (current === 'openrouter') {
        return await callOpenRouter(env, [{ role: 'user', content: prompt }]);
      }
      const s = current === 'openai' ? ['https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, 'gpt-4o-mini']
        : current === 'groq' ? ['https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY, 'llama-3.3-70b-versatile']
        : ['https://api.deepseek.com/chat/completions', env.DEEPSEEK_API_KEY, 'deepseek-chat'];
      const r = await fetch(s[0], { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s[1]}` }, body: JSON.stringify({ model: s[2], messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }) });
      if (!r.ok) throw new Error(await r.text());
      const d: any = await r.json(); return d.choices?.[0]?.message?.content || '';
    } catch (e) { console.error('Provider failed', current, e); lastError = e; }
  }
  throw lastError ?? new Error('All providers failed');
}

async function handler(request: Request, env: Env): Promise<Response> {
  const headers = cors(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: 'Authentication required' }, 401, headers);
  const authHeader = request.headers.get('Authorization')!;

  try {
    const body = await request.json() as any;
    const path = new URL(request.url).pathname;
    const startTime = Date.now();

      if (path === '/api/ai/generate') {
        const provider = body.provider as Provider;
        if (!['openrouter', 'openai', 'groq', 'deepseek'].includes(provider) || typeof body.topic !== 'string' || !Number.isInteger(body.amount) || body.amount < 1 || body.amount > 500) {
          return json({ error: 'Invalid generation request' }, 400, headers);
        }
        const text = await providerText(provider, quizPrompt(body.topic, body.amount, Array.isArray(body.alreadyGeneratedQuestions) ? body.alreadyGeneratedQuestions.slice(0, 100) : []), env);
        const result = extractJson(text);
        
        await logAiPerformance(env, authHeader, {
          user_id: userId,
          operation: 'generation',
          provider,
          status: 'success',
          latency_ms: Date.now() - startTime
        });

        return json(result, 200, headers);
      }

    if (path === '/api/ai/explain') {
      if (typeof body.questionText !== 'string' || !Array.isArray(body.options) || typeof body.correctAnswer !== 'string') return json({ error: 'Invalid explanation request' }, 400, headers);
      const prompt = `اشرح باختصار بالعربية لماذا الإجابة "${body.correctAnswer}" صحيحة للسؤال: ${body.questionText}. الخيارات: ${body.options.join(', ')}. أجب بـ JSON فقط: {"explanation":"..."}`;
      return json(extractJson(await providerText('openrouter', prompt, env)), 200, headers);
    }

    if (path === '/api/ai/generate-file') {
      if (typeof body.fileBase64 !== 'string' || body.fileBase64.length === 0 || body.fileBase64.length > 15_000_000 || typeof body.mimeType !== 'string' || !Number.isInteger(body.amount) || body.amount < 0 || body.amount > 500) {
        return json({ error: 'Invalid file generation request' }, 400, headers);
      }
      
      const isPdf = body.mimeType === 'application/pdf';
      const isLiteral = body.extractionMode !== 'generate';
      const extraInstruction = typeof body.customInstruction === 'string' ? ` تعليمات إضافية: ${body.customInstruction.slice(0, 1000)}` : '';

      // User's specific "Lossless" prompt for document extraction
      const losslessPrompt = `You are a lossless document extraction engine.

Extract EVERY question exactly as written.

Rules:
- Do not summarize.
- Do not rewrite.
- Do not fix spelling.
- Preserve numbering.
- Preserve A/B/C/D exactly.
- Do not skip any line.
- If a question starts on one page and continues on the next, merge it into one complete question.
- Return JSON only in the following format:
{
  "title": "Quiz Title",
  "description": "Quiz Description",
  "questions": [
    {
      "number": 1,
      "text": "Question text...",
      "type": "mcq",
      "options": ["A...", "B...", "C...", "D..."],
      "correctIndex": 0,
      "correctAnswer": "A...",
      "explanation": "Brief explanation"
    }
  ]
}

Strict Rules for type:
- Multiple choice -> "mcq"
- True/False -> "tf"
- Essay/Short answer -> "essay"
${extraInstruction}`;

      if (isLiteral) {
        try {
          let textContent = '';
          const fileData = Uint8Array.from(atob(body.fileBase64), c => c.charCodeAt(0));

          if (isPdf) {
            // PDF Chunking Pipeline
            const pdfDoc = await PDFDocument.load(fileData);
            const pageCount = pdfDoc.getPageCount();
            const chunkSize = 3;
            const chunks: string[] = [];
            
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

            // Process chunks in batches of 2 to avoid timeouts and rate limits
            const chunkResults: any[] = [];
            const CONCURRENCY = 2;
            for (let i = 0; i < chunks.length; i += CONCURRENCY) {
              const batch = chunks.slice(i, i + CONCURRENCY);
              const batchResults = await Promise.all(batch.map(async (chunkBase64, idx) => {
                try {
                  const text = await callOpenRouterWithFallback(env, [{
                    role: 'user',
                    content: [
                      { type: 'text', text: losslessPrompt },
                      { type: 'file', file: { filename: `chunk_${i + idx}.pdf`, file_data: `data:application/pdf;base64,${chunkBase64}` } },
                    ]
                  }], OPENROUTER_VISION_FALLBACKS, [{ id: 'file-parser', pdf: { engine: 'pdf-text' } }]);
                  return extractJson(text) as any;
                } catch (e) {
                  console.error(`Chunk ${i + idx} failed:`, e);
                  return { questions: [], error: String(e) };
                }
              }));
              chunkResults.push(...batchResults);
            }

            const finalQuiz: any = {
              title: chunkResults.find(r => r?.title)?.title || "Generated Quiz",
              description: chunkResults.find(r => r?.description)?.description || "",
              questions: []
            };
            for (const res of chunkResults) {
              if (res && Array.isArray(res.questions)) finalQuiz.questions.push(...res.questions);
            }

            await logAiPerformance(env, authHeader, {
              user_id: userId,
              operation: 'extraction',
              provider: 'openrouter',
              chunk_count: chunks.length,
              total_pages: pageCount,
              status: 'success',
              latency_ms: Date.now() - startTime
            });

            return json(finalQuiz, 200, headers);
          } else if (body.mimeType.includes('wordprocessingml') || body.mimeType.includes('msword')) {
            // Word Extraction
            const result = await mammoth.extractRawText({ arrayBuffer: fileData.buffer });
            textContent = result.value;
          } else if (body.mimeType.includes('spreadsheetml') || body.mimeType.includes('excel')) {
            // Excel Extraction
            const workbook = XLSX.read(fileData, { type: 'array' });
            textContent = workbook.SheetNames.map(name => {
              const sheet = workbook.Sheets[name];
              return `Sheet: ${name}\n${XLSX.utils.sheet_to_txt(sheet)}`;
            }).join('\n\n');
          } else if (body.mimeType.includes('presentationml') || body.mimeType.includes('powerpoint')) {
            // PPTX Extraction (OpenRouter fallback as PPTX parsing is complex)
            const text = await callOpenRouterWithFallback(env, [{
              role: 'user',
              content: [
                { type: 'text', text: losslessPrompt },
                { type: 'file', file: { filename: 'presentation.pptx', file_data: `data:${body.mimeType};base64,${body.fileBase64}` } },
              ]
            }], OPENROUTER_VISION_FALLBACKS, [{ id: 'file-parser' }]);
            return json(extractJson(text), 200, headers);
          }

          if (textContent) {
            // Process extracted text in chunks if it's very long
            const textChunks = textContent.match(/[\s\S]{1,10000}/g) || [textContent];
            const chunkResults = await Promise.all(textChunks.map(async (chunk) => {
              const text = await callOpenRouterWithFallback(env, [{
                role: 'user',
                content: `Content:\n${chunk}\n\n${losslessPrompt}`
              }]);
              return extractJson(text) as any;
            }));

            const finalQuiz: any = {
              title: chunkResults.find(r => r?.title)?.title || "Generated Quiz",
              description: chunkResults.find(r => r?.description)?.description || "",
              questions: []
            };
            for (const res of chunkResults) {
              if (res && Array.isArray(res.questions)) finalQuiz.questions.push(...res.questions);
            }
            return json(finalQuiz, 200, headers);
          }
        } catch (err) {
          console.error("Extraction failed:", err);
          // Fallback to direct file sending if custom extraction fails
        }
      }

      // Fallback for non-literal mode or failed extraction
      const prompt = isLiteral ? losslessPrompt : quizPrompt("document content", body.amount, []);
      const text = await callOpenRouterWithFallback(env, [{
        role: 'user',
        content: isPdf
          ? [
              { type: 'text', text: prompt },
              { type: 'file', file: { filename: 'document.pdf', file_data: `data:${body.mimeType};base64,${body.fileBase64}` } },
            ]
          : [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${body.mimeType};base64,${body.fileBase64}` } },
            ],
      }], OPENROUTER_VISION_FALLBACKS, isPdf ? [{ id: 'file-parser', pdf: { engine: 'pdf-text' } }] : undefined);
      
      return json(extractJson(text), 200, headers);
    }

    if (path === '/api/ai/groq') {
      if (typeof body.prompt !== 'string' || body.prompt.length > 20_000) return json({ error: 'Invalid Groq request' }, 400, headers);
      const history = Array.isArray(body.history) ? body.history.slice(-5).filter((message: any) => (message?.role === 'user' || message?.role === 'model') && typeof message.text === 'string').map((message: any) => ({ role: message.role === 'model' ? 'assistant' : 'user', content: message.text.slice(0, 10_000) })) : [];
      const messages: any[] = [];
      if (typeof body.systemInstruction === 'string') messages.push({ role: 'system', content: body.systemInstruction.slice(0, 10_000) });
      messages.push(...history, { role: 'user', content: body.prompt });
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json() as any;
      return json({ text: data.choices?.[0]?.message?.content || '' }, 200, headers);
    }

    if (path === '/api/ai/openrouter') {
      if (typeof body.prompt !== 'string' || body.prompt.length > 20_000) return json({ error: 'Invalid request' }, 400, headers);
      const allowedModels = [
        OPENROUTER_TEXT_MODEL,
        OPENROUTER_VISION_MODEL,
        'openai/gpt-4o-mini',
        'deepseek/deepseek-chat',
        'anthropic/claude-3.5-haiku',
        'qwen/qwen-2.5-72b-instruct',
      ];
      const model = allowedModels.includes(body.model) ? body.model : OPENROUTER_TEXT_MODEL;
      const history = Array.isArray(body.history) ? body.history.slice(-5).filter((message: any) => (message?.role === 'user' || message?.role === 'model') && typeof message.text === 'string').map((message: any) => ({ role: message.role === 'model' ? 'assistant' : 'user', content: message.text.slice(0, 10_000) })) : [];
      const messages: any[] = [];
      if (typeof body.systemInstruction === 'string') messages.push({ role: 'system', content: body.systemInstruction.slice(0, 10_000) });
      messages.push(...history);
      const hasImage = !!(body.image && typeof body.image.data === 'string' && typeof body.image.mimeType === 'string' && body.image.data.length <= 8_000_000);
      if (hasImage) {
        messages.push({ role: 'user', content: [{ type: 'text', text: body.prompt }, { type: 'image_url', image_url: { url: `data:${body.image.mimeType};base64,${body.image.data}` } }] });
      } else {
        messages.push({ role: 'user', content: body.prompt });
      }
      // Route to the vision model whenever an image is actually attached —
      // checking the model NAME for the substring 'vision' silently broke
      // this once the models were swapped to ones whose names don't contain
      // that word (google/gemma-4-31b-it:free, nvidia/nemotron-...), so
      // every image was being sent to a text-only model and failing.
      const text = await callOpenRouterWithFallback(env, messages, hasImage ? OPENROUTER_VISION_FALLBACKS : (allowedModels.includes(body.model) ? [body.model, ...OPENROUTER_TEXT_FALLBACKS] : OPENROUTER_TEXT_FALLBACKS));
      return json({ text }, 200, headers);
    }

    if (path === '/api/ai/openrouter/stream') {
      if (typeof body.prompt !== 'string' || body.prompt.length > 20_000) return json({ error: 'Invalid request' }, 400, headers);
      const history = Array.isArray(body.history) ? body.history.slice(-5).filter((message: any) => (message?.role === 'user' || message?.role === 'model') && typeof message.text === 'string').map((message: any) => ({ role: message.role === 'model' ? 'assistant' : 'user', content: message.text.slice(0, 10_000) })) : [];
      const messages: any[] = [];
      if (typeof body.systemInstruction === 'string') messages.push({ role: 'system', content: body.systemInstruction.slice(0, 10_000) });
      messages.push(...history);
      const hasImage = !!(body.image && typeof body.image.data === 'string' && typeof body.image.mimeType === 'string' && body.image.data.length <= 8_000_000);
      if (hasImage) {
        messages.push({ role: 'user', content: [{ type: 'text', text: body.prompt }, { type: 'image_url', image_url: { url: `data:${body.image.mimeType};base64,${body.image.data}` } }] });
      } else {
        messages.push({ role: 'user', content: body.prompt });
      }

      const candidates = hasImage ? OPENROUTER_VISION_FALLBACKS : OPENROUTER_TEXT_FALLBACKS;
      // Fallback only applies to picking which model actually starts
      // streaming — once a model accepts the connection and starts sending
      // tokens, we commit to it and pipe the rest straight through (a
      // mid-stream failure isn't retried, same tradeoff every ChatGPT-style
      // streaming UI makes).
      let upstream: Response | null = null;
      let lastErr: any = null;
      for (const model of candidates) {
        try {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': OPENROUTER_SITE_URL,
              'X-Title': OPENROUTER_SITE_NAME,
            },
            body: JSON.stringify({ model, messages, stream: true }),
          });
          if (r.ok && r.body) { upstream = r; break; }
          lastErr = await r.text();
        } catch (err) {
          lastErr = err;
        }
      }
      if (!upstream || !upstream.body) {
        return json({ error: `All streaming models failed: ${lastErr}` }, 502, headers);
      }

      // Proxy OpenRouter's raw SSE stream straight through to the browser.
      return new Response(upstream.body, {
        status: 200,
        headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      });
    }

    return json({ error: 'Not found' }, 404, headers);
  } catch (error) {
    console.error(error);
    return json({ error: 'AI provider request failed. Try another provider.' }, 502, headers);
  }
}

export default { fetch: handler };
