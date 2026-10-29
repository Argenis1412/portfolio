import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import About from '../components/About';
import { LanguageProvider } from '../context/LanguageContext';

let client: QueryClient;
afterEach(() => { client?.clear(); vi.restoreAllMocks(); localStorage.clear(); });

it('waits for the first native disclosure opening and retains Experience on reopen', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  const { container } = render(<QueryClientProvider client={client}><LanguageProvider><About /></LanguageProvider></QueryClientProvider>);
  const summary = screen.getByText('Experience and education');
  const experienceRequests = () => fetch.mock.calls.filter(([url]) => /\/api\/v1\/(experiences|formation)$/.test(String(url)));
  await waitFor(() => expect(client.isFetching()).toBe(0));
  summary.focus();
  await user.hover(summary);
  expect(container.querySelector('#experience')).toBeNull();
  expect(experienceRequests()).toHaveLength(0);

  await user.click(summary);
  await screen.findByRole('heading', { name: 'Journey' });
  const section = container.querySelector('#experience');
  expect(experienceRequests()).toHaveLength(2);
  await user.click(summary);
  expect(summary.parentElement?.hasAttribute('open')).toBe(false);
  expect(container.querySelector('#experience')).toBe(section);
  await user.click(summary);
  expect(summary.parentElement?.hasAttribute('open')).toBe(true);
  expect(container.querySelector('#experience')).toBe(section);
  expect(experienceRequests()).toHaveLength(2);
});
