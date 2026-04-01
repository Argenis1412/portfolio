import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { LanguageProvider } from './context/LanguageContext.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://d44387753a6da14292cc706234b19158@o4511145790341120.ingest.us.sentry.io/4511145952018432",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 4,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
})

// Add this button component to your app to test Sentry's error tracking
function ErrorButton() {
  return (
    <button
      onClick={() => {
        throw new Error('This is your first error!');
      }}
      className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50 hover:bg-red-700 font-bold"
    >
      Break the world
    </button>
  );
}

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
          <ErrorButton />
        </LanguageProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)

