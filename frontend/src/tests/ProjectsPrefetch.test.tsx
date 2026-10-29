import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { projectsQueryOptions, queryKeys } from '../hooks/useApi';
import { LanguageProvider } from '../context/LanguageContext';
import FeaturedProjects from '../components/FeaturedProjects';

afterEach(() => vi.unstubAllGlobals());

it('shares an in-flight startup prefetch with the projects hook', async () => {
  let finish!: (response: Response) => void;
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetch);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const prefetch = client.prefetchQuery(projectsQueryOptions);

  render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter><FeaturedProjects /></MemoryRouter></LanguageProvider></QueryClientProvider>);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]).toBeDefined();
  expect(screen.getByRole('status').textContent).toContain('Loading projects');

  await act(async () => {
    finish(new Response(JSON.stringify({ projects: [] }), { status: 200 }));
    await prefetch;
  });

  expect(await screen.findByText('No projects found.')).toBeTruthy();
  expect(client.getQueryData(queryKeys.projects)).toEqual([]);
  expect(fetch).toHaveBeenCalledTimes(1);
  client.clear();
});
