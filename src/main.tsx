import { StrictMode } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.tsx';
import App from './App.tsx';
import { recordPushNotificationOpen } from './lib/db';
import { supabase } from './lib/supabaseClient';
import { ServiceWorkerUpdatePrompt } from './components/ServiceWorkerUpdatePrompt.tsx';
import { NativeAppUpdatePrompt } from './components/NativeAppUpdatePrompt.tsx';
import { AppRuntimeBoundary } from './components/AppRuntimeBoundary.tsx';
import './index.css';

async function completeNativeAuthCallback(rawUrl: string) {
  try {
    const callbackUrl = new URL(rawUrl);
    const trustedHosts = new Set(['quiz-space-app.pages.dev', 'quiz-space-share.pages.dev']);
    if (trustedHosts.has(callbackUrl.hostname.toLowerCase())) {
      const hashQuiz = callbackUrl.hash.match(/^#\/?quiz\/([A-Za-z0-9_-]{1,256})/i)?.[1];
      const sharedQuiz = callbackUrl.hostname.toLowerCase() === 'quiz-space-share.pages.dev'
        ? callbackUrl.searchParams.get('quiz')
        : null;
      const quizId = hashQuiz || (sharedQuiz && /^[A-Za-z0-9_-]{1,256}$/.test(sharedQuiz) ? sharedQuiz : null);
      if (quizId) {
        window.location.hash = `#/quiz/${encodeURIComponent(quizId)}`;
        return;
      }
    }

    const code = callbackUrl.searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      const hash = callbackUrl.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
      }
    }
    window.location.hash = '#/dashboard/landing';
  } catch (error) {
    console.error('Native auth callback could not be completed', error instanceof Error ? error.message : 'unknown');
  }
}

if (Capacitor.isNativePlatform()) {
  void CapacitorApp.addListener('appUrlOpen', ({ url }) => completeNativeAuthCallback(url));
  void CapacitorApp.getLaunchUrl().then((launch) => {
    if (launch?.url) return completeNativeAuthCallback(launch.url);
    return undefined;
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  },
});

const pushQuery = window.location.search.slice(1) || window.location.hash.split('?')[1] || '';
const pushEventId = new URLSearchParams(pushQuery).get('pushEventId');
if (pushEventId) void recordPushNotificationOpen(pushEventId);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRuntimeBoundary>
          <App />
          <ServiceWorkerUpdatePrompt />
          <NativeAppUpdatePrompt />
        </AppRuntimeBoundary>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
