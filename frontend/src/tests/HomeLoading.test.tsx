import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../context/LanguageContext';
import { HomeSectionSkeleton } from '../components/ui/HomeLoadingSkeleton';
import FeaturedProjects from '../components/FeaturedProjects';
import { useProjects } from '../hooks/useApi';

vi.mock('../hooks/useApi', () => ({ useProjects: vi.fn() }));

afterEach(() => localStorage.clear());

const renderProjects = (loading: boolean) => {
  vi.mocked(useProjects).mockReturnValue({ data: [], isLoading: loading, isError: false } as unknown as ReturnType<typeof useProjects>);
  return render(<LanguageProvider><MemoryRouter><FeaturedProjects /></MemoryRouter></LanguageProvider>);
};

describe('home loading geometry', () => {
  it.each([
    ['en', 'Loading projects…'],
    ['pt', 'Carregando projetos…'],
    ['es', 'Cargando proyectos…'],
  ])('announces one localized loading state with four decorative rows in %s', (language, message) => {
    localStorage.setItem('portfolio_lang', language);
    const { container } = renderProjects(true);
    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(container.querySelector('#projects')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.home-project-placeholder')).toHaveLength(4);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('removes loading geometry for a resolved empty response', () => {
    const { container } = renderProjects(false);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('#projects')).toHaveAttribute('aria-busy', 'false');
    expect(container.querySelectorAll('.home-project-placeholder')).toHaveLength(0);
    expect(screen.getByText('No projects found.')).toBeVisible();
  });

  it.each(['about', 'contact'] as const)('marks the %s section placeholder busy', section => {
    const { container } = render(<LanguageProvider><HomeSectionSkeleton section={section} /></LanguageProvider>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading section…');
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
