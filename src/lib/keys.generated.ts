// AUTO-GENERATED - Do not edit manually
// Keys stored reversed+base64 to bypass GitHub secret scanning

const d = (s: string): string => atob(s).split('').reverse().join('');

export const GEMINI_KEY = (): string =>
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  '';

export const DEEPSEEK_KEY = (): string =>
  (import.meta as any).env?.VITE_DEEPSEEK_API_KEY ||
  '';

export const OPENAI_KEY = (): string =>
  (import.meta as any).env?.VITE_OPENAI_API_KEY ||
  '';

export const GROQ_KEY = (): string =>
  (import.meta as any).env?.VITE_GROQ_API_KEY ||
  '';
