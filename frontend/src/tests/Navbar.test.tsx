/**
 * Testes de qualidade do componente Navbar.
 *
 * Verifica renderização, links de navegação, seletor de idioma e botão de tema.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Navbar from '../components/Navbar';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Helper para renderizar o Navbar com todos os contextos necessários
const renderNavbar = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <Navbar />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );


// ─── Renderização ─────────────────────────────────────────────────────────────

describe('Navbar – renderização', () => {
  it('renderiza sem erros', () => {
    expect(() => renderNavbar()).not.toThrow();
  });

  it('renderiza o elemento <nav>', () => {
    const { container } = renderNavbar();
    expect(container.querySelector('nav')).toBeTruthy();
  });
});

// ─── Links de navegação ────────────────────────────────────────────────────────

describe('Navbar – navegação por botões', () => {
  it('exibe o botón para Contato correctamente', () => {
    const { getByTestId } = renderNavbar();
    const btn = getByTestId('nav-contact');
    expect(btn).toBeTruthy();
  });

  it('o clique no botón de contato não lança erro', () => {
    const { getByTestId } = renderNavbar();
    const btn = getByTestId('nav-contact');
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});

// ─── Seletor de idioma ─────────────────────────────────────────────────────────

describe('Navbar – seletor de idioma', () => {
  it('renderiza o seletor de idioma com as opções PT, EN e ES', () => {
    renderNavbar();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('pt');
    expect(options).toContain('en');
    expect(options).toContain('es');
  });

  it('muda o idioma selecionado quando o usuário escolhe EN', () => {
    renderNavbar();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'en' } });
    expect(select.value).toBe('en');
  });
});

// ─── Botão de tema ─────────────────────────────────────────────────────────────

describe('Navbar – botão de tema', () => {
  it('renderiza o botão de alternância de tema', () => {
    renderNavbar();
    const btn = screen.getByRole('button', { name: /toggle theme/i });
    expect(btn).toBeTruthy();
  });

  it('o clique no botão não lança erro', () => {
    renderNavbar();
    const btn = screen.getByRole('button', { name: /toggle theme/i });
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});
