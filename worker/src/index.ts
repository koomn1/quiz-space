export interface Env {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  GROQ_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGIN: string;
}

type Provider = 'gemini' | 'openai' | 'groq' | 'deepseek';

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

async function requireUser(request: Request, env: Env): Promise<boolean> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization },
  });
  return response.ok;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```json\s*|^```|```$/gim, '').trim();
  return JSON.parse(cleaned);
}

function quizPrompt(topic: string, amount: number, previous: string[]): string {
  const exclusions = previous.length ? `\nلا تكرر هذه الأسئلة: ${previous.join(' | ')}` : '';
  return `أنشئ اختباراً من ${amount} أسئلة عن: ${topic}.${exclusions}
أجب بـ JSON صالح فقط وفق الشكل التالي:
{"title":"عنوان الاختبار","description":"وصف الاختبار","questions":[{"text":"نص السؤال","type":"mcq","options":["خيار 1","خيار 2","خيار 3","خيار 4"],"correctIndex":0,"correctAnswer":"","explanation":"الشرح العلمي"}]}`;
}

async function providerText(provider: Provider, prompt: string, env: Env): Promise<string> {
  if (provider === 'gemini') {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  const settings = provider === 'openai'
    ? ['https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, 'gpt-4o-mini']
    : provider === 'groq'
      ? ['https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY, 'llama-3.3-70b-versatile']
      : ['https://api.deepseek.com/chat/completions', env.DEEPSEEK_API_KEY, 'deepseek-chat'];
  const response = await fetch(settings[0], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings[1]}` },
    body: JSON.stringify({ model: settings[2], messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

async function handler(request: Request, env: Env): Promise<Response> {
  const headers = cors(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);
  if (!await requireUser(request, env)) return json({ error: 'Authentication required' }, 401, headers);

  try {
    const body = await request.json() as any;
    if (new URL(request.url).pathname === '/api/ai/generate') {
      const provider = body.provider as Provider;
      if (!['gemini', 'openai', 'groq', 'deepseek'].includes(provider) || typeof body.topic !== 'string' || !Number.isInteger(body.amount) || body.amount < 1 || body.amount > 40) {
        return json({ error: 'Invalid generation request' }, 400, headers);
      }
      const text = await providerText(provider, quizPrompt(body.topic, body.amount, Array.isArray(body.alreadyGeneratedQuestions) ? body.alreadyGeneratedQuestions.slice(0, 100) : []), env);
      return json(extractJson(text), 200, headers);
    }
    if (new URL(request.url).pathname === '/api/ai/explain') {
      if (typeof body.questionText !== 'string' || !Array.isArray(body.options) || typeof body.correctAnswer !== 'string') return json({ error: 'Invalid explanation request' }, 400, headers);
      const prompt = `اشرح باختصار بالعربية لماذا الإجابة "${body.correctAnswer}" صحيحة للسؤال: ${body.questionText}. الخيارات: ${body.options.join(', ')}. أجب بـ JSON فقط: {"explanation":"..."}`;
      return json(extractJson(await providerText('gemini', prompt, env)), 200, headers);
    }
    if (new URL(request.url).pathname === '/api/ai/generate-file') {
      if (typeof body.fileBase64 !== 'string' || body.fileBase64.length === 0 || body.fileBase64.length > 12_000_000 || typeof body.mimeType !== 'string' || !Number.isInteger(body.amount) || body.amount < 1 || body.amount > 40) {
        return json({ error: 'Invalid file generation request' }, 400, headers);
      }
      const prompt = `قم بصياغة ${body.amount} أسئلة اختيار من متعدد من المستند المرفق بالاعتماد على محتواه.${typeof body.customInstruction === 'string' ? ` تعليمات إضافية: ${body.customInstruction.slice(0, 2000)}` : ''}
أجب بـ JSON صالح فقط وفق الشكل التالي:
{"title":"عنوان الاختبار","description":"وصف الاختبار","questions":[{"text":"السؤال","type":"mcq","options":["أ","ب","ج","د"],"correctIndex":0,"correctAnswer":"أ","explanation":"شرح"}]}`;
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: body.mimeType, data: body.fileBase64 } }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json() as any;
      return json(extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || ''), 200, headers);
    }
    if (new URL(request.url).pathname === '/api/ai/gemini') {
      if (typeof body.prompt !== 'string' || body.prompt.length > 20_000) return json({ error: 'Invalid Gemini request' }, 400, headers);
      const allowedModels = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'];
      const model = allowedModels.includes(body.model) ? body.model : 'gemini-2.0-flash';
      const history = Array.isArray(body.history) ? body.history.slice(-5).filter((message: any) => (message?.role === 'user' || message?.role === 'model') && typeof message.text === 'string').map((message: any) => ({ role: message.role, parts: [{ text: message.text.slice(0, 10_000) }] })) : [];
      const parts: any[] = [{ text: body.prompt }];
      if (body.image && typeof body.image.data === 'string' && typeof body.image.mimeType === 'string' && body.image.data.length <= 8_000_000) parts.push({ inline_data: { mime_type: body.image.mimeType, data: body.image.data } });
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_instruction: typeof body.systemInstruction === 'string' ? { parts: [{ text: body.systemInstruction.slice(0, 10_000) }] } : undefined, contents: [...history, { role: 'user', parts }] }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json() as any;
      return json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' }, 200, headers);
    }
    return json({ error: 'Not found' }, 404, headers);
  } catch (error) {
    console.error(error);
    return json({ error: 'AI provider request failed. Try another provider.' }, 502, headers);
  }
}

export default { fetch: handler };
