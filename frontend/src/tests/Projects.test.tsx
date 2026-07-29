import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Projects from '../components/Projects';
import { LanguageProvider } from '../context/LanguageContext';
import { useProjects } from '../hooks/useApi';

vi.mock('../hooks/useApi');

const projects = [
  {
    id: 'first-project',
    name: 'First Project',
    short_description: { pt: 'Primeiro', en: 'First', es: 'Primero' },
    full_description: {
      pt: '<p>One</p><p>Two</p><p>Three</p><p>Four</p><p>Five</p>',
      en: '<p>One</p><p>Two</p><p>Three</p><p>Four</p><p>Five</p>',
      es: '<p>One</p><p>Two</p><p>Three</p><p>Four</p><p>Five</p>',
    },
    technologies: ['TypeScript'],
    features: [],
    learnings: [],
    highlighted: true,
    repository: null,
    demo: null,
    image: null,
  },
  {
    id: 'second-project',
    name: 'Second Project',
    short_description: { pt: 'Segundo', en: 'Second', es: 'Segundo' },
    full_description: {
      pt: '<p>One</p><p>Two</p><p>Three</p><p>Four</p><p>Five</p>',
      en: '<p>One</p><p>Two</p><p>Three</p><p>Four</p><p>Five</p>',
      es: '<p>One</p><p>Two</p><p>Three</p><p>Four</p><p>Five</p>',
    },
    technologies: ['TypeScript'],
    features: [],
    learnings: [],
    highlighted: false,
    repository: null,
    demo: null,
    image: null,
  },
];

describe('Projects navigation', () => {
  beforeEach(() => {
    vi.mocked(useProjects).mockReturnValue({
      data: projects,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProjects>);
  });

  it('ignores arrow navigation from editable controls', () => {
    render(
      <LanguageProvider>
        <Projects />
      </LanguageProvider>
    );

    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowRight' });

    expect(screen.getByText('First Project')).toBeTruthy();
    expect(screen.queryByText('Second Project')).toBeNull();
    input.remove();
  });

  it('navigates with arrow keys from a non-editable target', async () => {
    render(
      <LanguageProvider>
        <Projects />
      </LanguageProvider>
    );

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => expect(screen.getByText('Second Project')).toBeTruthy());
  });
});
