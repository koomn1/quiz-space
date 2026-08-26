export type SaveValidationQuestion = {
  type?: string;
  options?: unknown;
  correctIndex?: unknown;
};

export type InvalidQuizQuestion = {
  index: number;
  reason: 'missing-answer' | 'empty-option';
};

export function getInvalidQuizQuestions(questions: SaveValidationQuestion[]): InvalidQuizQuestion[] {
  return questions.reduce<InvalidQuizQuestion[]>((invalid, question, index) => {
    if (question.type === 'essay') return invalid;
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.some(option => typeof option !== 'string' || !option.trim())) {
      invalid.push({ index, reason: 'empty-option' });
      return invalid;
    }
    if (!Number.isInteger(question.correctIndex) || (question.correctIndex as number) < 0 || (question.correctIndex as number) >= options.length) {
      invalid.push({ index, reason: 'missing-answer' });
    }
    return invalid;
  }, []);
}

export function countVerifiedQuizQuestions(questions: SaveValidationQuestion[]): number {
  return questions.length - getInvalidQuizQuestions(questions).length;
}
