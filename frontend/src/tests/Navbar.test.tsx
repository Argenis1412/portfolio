/**
 * Quality tests for Navbar component.
 *
 * Verifies rendering, navigation links, language selector and theme button.
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

// Helper to render Navbar with all required contexts
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


// ─── Rendering ─────────────────────────────────────────────────────────────

describe('Navbar - rendering', () => {
  it('renders without errors', () => {
    expect(() => renderNavbar()).not.toThrow();
  });

  it('renders the <nav> element', () => {
    const { container } = renderNavbar();
    expect(container.querySelector('nav')).toBeTruthy();
  });
});

// ─── Navigation links ────────────────────────────────────────────────────────

describe('Navbar - button navigation', () => {
  it('displays the Contact button correctly', () => {
    const { getByTestId } = renderNavbar();
    const btn = getByTestId('nav-contact');
    expect(btn).toBeTruthy();
  });

  it('clicking the contact button does not throw error', () => {
    const { getByTestId } = renderNavbar();
    const btn = getByTestId('nav-contact');
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});

// ─── Language selector ─────────────────────────────────────────────────────────

describe('Navbar - language selector', () => {
  it('renders language selector with PT, EN and ES options', () => {
    renderNavbar();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('pt');
    expect(options).toContain('en');
    expect(options).toContain('es');
  });

  it('changes selected language when user chooses EN', () => {
    renderNavbar();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'en' } });
    expect(select.value).toBe('en');
  });
});

// ─── Theme button ─────────────────────────────────────────────────────────────

describe('Navbar - theme button', () => {
  it('renders theme toggle button', () => {
    renderNavbar();
    const btn = screen.getByRole('button', { name: /toggle theme/i });
    expect(btn).toBeTruthy();
  });

  it('clicking the button does not throw error', () => {
    renderNavbar();
    const btn = screen.getByRole('button', { name: /toggle theme/i });
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});
