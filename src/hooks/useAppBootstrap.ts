import { useCallback, useEffect, useState } from 'react';
import { getQuizzes } from '../lib/db';
import { initAppOrigin } from '../lib/origin';
import type { Quiz } from '../types';

type QuizDetectedHandler = (quizId: string) => void;

export function useQuizCatalog() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);

  const fetchQuizzesList = useCallback(async () => {
    setIsLoadingQuizzes(true);
    try {
      const data = await getQuizzes();
      setQuizzes(data);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setIsLoadingQuizzes(false);
    }
  }, []);

  return { quizzes, isLoadingQuizzes, fetchQuizzesList };
}

export function useAppBootstrap({ onQuizDetected, fetchQuizzesList }: {
  onQuizDetected: QuizDetectedHandler;
  fetchQuizzesList: () => Promise<void>;
}) {
  useEffect(() => {
    initAppOrigin();

    let path = window.location.pathname;
    if (path.startsWith('/quiz-space')) path = path.slice(11);

    let quizId: string | null = null;
    const hashClean = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    const hashMatch = hashClean.match(/^quiz\/([^\/?#]+)/);
    if (hashMatch?.[1]) quizId = hashMatch[1];

    if (!quizId) {
      const pathMatch = path.match(/^\/quiz\/([^\/]+)/) || path.match(/^\/apps\/([^\/]+)/);
      if (pathMatch?.[1]) quizId = pathMatch[1];
    }

    if (quizId) onQuizDetected(quizId);
    void fetchQuizzesList();
  }, [fetchQuizzesList, onQuizDetected]);
}
