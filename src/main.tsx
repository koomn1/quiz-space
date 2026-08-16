import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.tsx';
import App from './App.tsx';
import { recordPushNotificationOpen } from './lib/db';
import { precacheQuizSpaceProfileAssets, registerQuizSpaceServiceWorker } from './lib/serviceWorker';
import './index.css';

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

void registerQuizSpaceServiceWorker().then((registration) => {
  if (registration) void precacheQuizSpaceProfileAssets(registration);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
