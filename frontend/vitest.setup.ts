import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * Network isolation for unit tests
 *
 * The App renders sections that fetch portfolio data from the backend.
 * In unit tests we don't want to depend on a real API server running,
 * so we provide a minimal `fetch` mock that returns deterministic JSON.
 */

const mockJsonResponse = (data: unknown, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

vi.stubGlobal(
  'fetch',
  vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    // Portfolio endpoints used by the App during initial render
    if (url.includes('/api/v1/sobre')) {
      return mockJsonResponse({
        nome: 'Test User',
        titulo: 'Developer',
        localizacao: 'Remote',
        email: 'test@example.com',
        telefone: '000',
        github: 'https://github.com/test',
        linkedin: 'https://linkedin.com/in/test',
        descricao: { pt: 'PT', en: 'EN', es: 'ES' },
        disponibilidade: { pt: 'PT', en: 'EN', es: 'ES' },
      });
    }

    if (url.includes('/api/v1/projetos')) {
      return mockJsonResponse({ projetos: [], total: 0 });
    }

    if (url.includes('/api/v1/stack')) {
      return mockJsonResponse({ stack: [], por_categoria: {} });
    }

    if (url.includes('/api/v1/experiencias')) {
      return mockJsonResponse({ experiencias: [], total: 0 });
    }

    if (url.includes('/api/v1/formacao')) {
      return mockJsonResponse({ formacoes: [], total: 0 });
    }

    if (url.includes('/api/v1/metrics/summary')) {
      return mockJsonResponse({
        p95_ms: 44,
        p95_status: 'healthy',
        requests_24h: 1024,
        error_rate: 0.013,
        error_rate_pct: '1.30%',
        error_rate_status: 'stable',
        system_status: 'operational',
        uptime: '2h 14m',
        window: 'last_24h',
        timestamp: new Date().toISOString(),
      });
    }

    // Default: explicit failure (helps detect unexpected network calls)
    return mockJsonResponse({ message: `Unhandled fetch: ${url}` }, 500);
  })
);

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
