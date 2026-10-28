import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Experience from '../components/Experience';
import { LanguageProvider } from '../context/LanguageContext';
import { useExperience, useFormation } from '../hooks/useApi';

vi.mock('../hooks/useApi', () => ({
  useExperience: vi.fn(),
  useFormation: vi.fn(),
}));

describe('experience load failures', () => {
  beforeEach(() => {
    const ready = { data: [], isLoading: false, isError: false };
    vi.mocked(useExperience).mockReturnValue(ready as unknown as ReturnType<typeof useExperience>);
    vi.mocked(useFormation).mockReturnValue(ready as unknown as ReturnType<typeof useFormation>);
  });

  afterEach(() => localStorage.clear());

  const languages = [
    ['en', 'This section could not be loaded. Please reload the page to try again.', 'Reload page'],
    ['pt', 'Não foi possível carregar esta seção. Recarregue a página para tentar novamente.', 'Recarregar página'],
    ['es', 'No se pudo cargar esta sección. Recarga la página para volver a intentarlo.', 'Recargar página'],
  ] as const;

  for (const source of ['experience', 'education'] as const) {
    it.each(languages)(`shows a neutral localized error for ${source} failures in %s`, (language, message, reload) => {
      const failed = { data: [], isLoading: false, isError: true };
      if (source === 'experience') {
        vi.mocked(useExperience).mockReturnValue(failed as unknown as ReturnType<typeof useExperience>);
      } else {
        vi.mocked(useFormation).mockReturnValue(failed as unknown as ReturnType<typeof useFormation>);
      }
      localStorage.setItem('portfolio_lang', language);

      render(<LanguageProvider><Experience /></LanguageProvider>);

      expect(screen.getByRole('alert').textContent).toContain(message);
      expect(screen.getByRole('button', { name: reload }).hasAttribute('disabled')).toBe(false);
      expect(screen.queryByText(/cold start|free tier|plano gratuito|plan gratuito/i)).toBeNull();
    });
  }
});
