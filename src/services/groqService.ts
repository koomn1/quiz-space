import { fetchWithAuth } from '../lib/authFetch';
import { getApiUrl } from '../lib/origin';
import { GeneratedQuiz } from '../types';

import { GROQ_KEY } from '../lib/keys.generated';

export async function generateWithGroq(
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

  const apiKey = GROQ_KEY() || (typeof localStorage !== 'undefined' ? localStorage.getItem('groq_api_key') : null);

  const callDirectGroq = async (keyToUse: string): Promise<GeneratedQuiz> => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyToUse}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: `أنشئ اختبار مكون من ${amount} أسئلة عن: ${standardizedTopic}` }]
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Direct Groq API call failed.');
    }
    const data = await res.json();
    const candidateText = data.choices?.[0]?.message?.content || '';
    const cleanedText = candidateText.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleanedText) as GeneratedQuiz;
  };

  if (apiKey) {
    try {
      return await callDirectGroq(apiKey);
    } catch (err) {
      console.warn('Direct Groq call failed:', err);
      throw err;
    }
  }

  // No API key - prompt user
  const userPromptKey = window.prompt(
    'أدخل Groq API Key لاستخدام هذه الخدمة:\n(Enter your Groq API Key to use this service)'
  );
  if (userPromptKey) {
    localStorage.setItem('groq_api_key', userPromptKey);
    return await callDirectGroq(userPromptKey);
  }

  throw new Error('You must be signed in to use AI features');
}


