import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { LanguageProvider } from './context/LanguageContext.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Deferred Sentry initialization to improve FCP/LCP
const initSentry = async () => {
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
};

// Start initialization without blocking main thread
initSentry().catch(console.error);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos estáticos: 15 min stale, 30 min en cache (gcTime >> staleTime)
      staleTime: 15 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      // Portfolio estático: no necesita refetch al cambiar de tab ni en cada montaje
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // 1 reintento máximo — con 4 el recruiter espera ~30s antes de ver error
      retry: 1,
      retryDelay: 1000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

