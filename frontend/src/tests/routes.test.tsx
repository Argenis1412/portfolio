import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { LanguageProvider } from '../context/LanguageContext';

const renderApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </QueryClientProvider>,
  );
};

const visit = (path: string) => window.history.pushState({}, '', path);

describe('public routes', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it.each([
    ['/decisions/json-first', 'JSON-first reads'],
    ['/production-evidence', 'Production evidence'],
  ])('renders the %s deep link', async (path, heading) => {
    visit(path);

    renderApp();

    expect(await screen.findByRole('heading', { name: heading })).toBeTruthy();
  });

  it('renders the project query error state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('projects unavailable')));
    visit('/projects/rate-limiter');
    renderApp();
    expect(await screen.findByText('Case study data is unavailable.')).toBeTruthy();
  });

  it('renders a localized and keyboard-accessible 404 page', async () => {
    localStorage.setItem('portfolio_lang', 'es');
    visit('/missing-page');

    renderApp();

    const heading = await screen.findByRole('heading', { name: 'Página no encontrada' });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByRole('link', { name: 'Volver al inicio' }).getAttribute('href')).toBe('/');
  });

  it('localizes and focuses placeholder route headings', async () => {
    localStorage.setItem('portfolio_lang', 'pt');
    visit('/production-evidence');

    renderApp();

    const heading = await screen.findByRole('heading', { name: 'Evidência de produção' });
    expect(heading).toBe(document.activeElement);
    expect(screen.getByText('Portfólio')).toBeTruthy();
  });
});
