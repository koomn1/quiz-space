import { StrictMode } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.tsx';
import App from './App.tsx';
import { recordPushNotificationOpen } from './lib/db';
import { ServiceWorkerUpdatePrompt } from './components/ServiceWorkerUpdatePrompt.tsx';
import { NativeAppUpdatePrompt } from './components/NativeAppUpdatePrompt.tsx';
import { supabase } from './lib/supabaseClient';
import './index.css';

async function completeNativeAuthCallback(rawUrl: string) {
  try {
    const callbackUrl = new URL(rawUrl);
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
    console.error('Native auth callback could not be completed', error);
  }
}

if (Capacitor.isNativePlatform()) {
  void CapacitorApp.addListener('appUrlOpen', ({ url }) => completeNativeAuthCallback(url));
  void CapacitorApp.getLaunchUrl().then((launch) => {
    if (launch?.url) return completeNativeAuthCallback(launch.url);
    return undefined;
  });
}

// Instantiate the global Query Client with real-time defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Mark data as stale immediately for active fetching
      refetchOnWindowFocus: true, // Always refetch on focus
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
        <App />
        <ServiceWorkerUpdatePrompt />
        <NativeAppUpdatePrompt />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
