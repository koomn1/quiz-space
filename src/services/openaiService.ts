import { fetchWithAuth } from '../lib/authFetch';
import { getApiUrl } from '../lib/origin';
import { GeneratedQuiz } from '../types';

import { OPENAI_KEY } from '../lib/keys.generated';

export async function generateWithOpenAI(
  topic: string,
  amount: number,
  alreadyGeneratedQuestions?: string[]
): Promise<GeneratedQuiz> {
  const standardizedTopic = `الموضوع المطلوب: "${topic}"
تعليمات هامة للغاية لنموذج الذكاء الاصطناعي:
يجب صياغة الاختبار بدقة عالية وتنسيق المحتوى كـ JSON صالح ومباشر بدون أي مقدمات أو علامات اقتباس مسبقة من نوع markdown.
تأكد من أن الاستجابة تطابق تماماً الهيكل المطلوب:
{
  "title": "عنوان الاختبار",
  "description": "وصف الاختبار",
  "questions": [
    {
      "text": "نص السؤال",
      "type": "mcq",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctIndex": 0,
      "correctAnswer": "",
      "explanation": "الشرح العلمي"
    }
  ]
}`;

  const apiKey = OPENAI_KEY() || (typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') : null);

  const callDirectOpenAI = async (keyToUse: string): Promise<GeneratedQuiz> => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyToUse}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: `أنشئ اختبار مكون من ${amount} أسئلة عن: ${standardizedTopic}` }]
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Direct OpenAI API call failed.');
    }
    const data = await res.json();
    const candidateText = data.choices?.[0]?.message?.content || '';
    const cleanedText = candidateText.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleanedText) as GeneratedQuiz;
  };

  if (apiKey) {
    try {
      return await callDirectOpenAI(apiKey);
    } catch (err) {
      console.warn('Direct OpenAI call failed:', err);
      throw err;
    }
  }

  // No API key - prompt user
  const userPromptKey = window.prompt(
    '\u0623\u062f\u062e\u0644 OpenAI API Key \u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0647\u0630\u0644 \u0627\u0644\u062e\u062f\u0645\u0629:\n(Enter your OpenAI API Key to use this service)'
  );
  if (userPromptKey) {
    localStorage.setItem('openai_api_key', userPromptKey);
    return await callDirectOpenAI(userPromptKey);
  }

  throw new Error('You must be signed in to use AI features');
}
