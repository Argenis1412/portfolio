import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { LanguageProvider } from './context/LanguageContext.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  sendDefaultPii: false,
});

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
    <Sentry.ErrorBoundary fallback={
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
        <h2>Oops! Un error inesperado ocurrió en la aplicación.</h2>
      </div>
    }>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)

