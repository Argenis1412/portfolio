import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import FeaturedProjects from '../components/FeaturedProjects';
import { LanguageProvider } from '../context/LanguageContext';
import { useProjects } from '../hooks/useApi';

vi.mock('../hooks/useApi', () => ({ useProjects: vi.fn() }));
afterEach(() => localStorage.clear());

it.each([
  ['en', 'Read case study', 'Source code'],
  ['pt', 'Ler estudo de caso', 'Código-fonte'],
  ['es', 'Leer caso de estudio', 'Código fuente'],
])('distinguishes link destinations without changing visible labels in %s', (language, caseLabel, sourceLabel) => {
  localStorage.setItem('portfolio_lang', language);
  const projects = ['First project', 'Second project'].map((name, index) => ({
    id: `project-${index}`, name, short_description: { en: 'Description', pt: 'Descrição', es: 'Descripción' },
    technologies: [], case_study: {}, repository: `https://github.com/example/project-${index}`,
  }));
  vi.mocked(useProjects).mockReturnValue({ data: projects, isLoading: false, isError: false } as unknown as ReturnType<typeof useProjects>);
  render(<LanguageProvider><MemoryRouter><FeaturedProjects /></MemoryRouter></LanguageProvider>);

  for (const [index, project] of projects.entries()) {
    const caseLink = screen.getByRole('link', { name: `${caseLabel} — ${project.name}` });
    const sourceLink = screen.getByRole('link', { name: `${sourceLabel} — ${project.name}` });
    expect(caseLink).toHaveTextContent(caseLabel);
    expect(sourceLink).toHaveTextContent(sourceLabel);
    expect(caseLink).toHaveAttribute('href', `/projects/project-${index}`);
    expect(sourceLink).toHaveAttribute('href', project.repository);
  }
  const names = screen.getAllByRole('link').map(link => link.getAttribute('aria-label'));
  expect(new Set(names).size).toBe(4);
});
