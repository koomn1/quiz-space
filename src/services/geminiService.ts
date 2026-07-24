import { fetchWithAuth } from '../lib/authFetch';
import { getApiUrl } from '../lib/origin';
import { GeneratedQuiz } from '../types';

import { GEMINI_KEY } from '../lib/keys.generated';

export async function generateWithGemini(
  topic: string,
  amount: number,
  alreadyGeneratedQuestions?: string[]
): Promise<GeneratedQuiz> {
  // Wrap the topic cleanly with a static system instruction to enforce a pure JSON output structure
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

  const apiKey = GEMINI_KEY() || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') : null);

  // Helper for direct Gemini API call
  const callDirectGemini = async (keyToUse: string): Promise<GeneratedQuiz> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyToUse}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `أنشئ اختبار مكون من ${amount} أسئلة عن: ${standardizedTopic}` }] }]
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Direct Gemini API call failed.');
    }
    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedText = candidateText.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleanedText) as GeneratedQuiz;
  };

  if (apiKey) {
    try {
      return await callDirectGemini(apiKey);
    } catch (directErr) {
      console.warn('Direct Gemini API call failed:', directErr);
      throw directErr;
    }
  }

  const userPromptKey = prompt('لمعاملة الذكاء الاصطناعي على GitHub Pages، الرجاء إدخال Gemini API Key الخاص بك (سيتم حفظه في متصفحك):');
  if (userPromptKey) {
    localStorage.setItem('gemini_api_key', userPromptKey);
    return await callDirectGemini(userPromptKey);
  }
  throw new Error('يتطلب الذكاء الاصطناعي إما ضبط المفتاح في الإعدادات أو إدخال Gemini API Key.');
}

export async function explainQuestionWithGemini(
  questionText: string,
  options: string[],
  correctAnswer: string
): Promise<{ explanation: string }> {
  const apiKey = GEMINI_KEY() || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') : null);
  
  const callDirect = async (key: string) => {
    const promptText = `Please explain why "${correctAnswer}" is the correct answer for the following question. Keep it concise, educational and in Arabic if the question is in Arabic.
Question: ${questionText}
Options: ${options.join(', ')}

Return ONLY a valid JSON object with the structure: {"explanation": "your explanation here"}`;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });
    
    if (!res.ok) throw new Error('Failed to get explanation from Gemini');
    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedText = candidateText.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleanedText);
  };

  if (apiKey) return await callDirect(apiKey);

  const userPromptKey = prompt('الرجاء إدخال Gemini API Key الخاص بك للحصول على الشرح:');
  if (userPromptKey) {
    localStorage.setItem('gemini_api_key', userPromptKey);
    return await callDirect(userPromptKey);
  }
  throw new Error('API Key missing');
}


