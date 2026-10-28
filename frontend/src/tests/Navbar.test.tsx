/**
 * Quality tests for Navbar component.
 *
 * Verifies rendering, navigation links, language selector and theme button.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, it, expect } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.hash}`}</output>;
};

const renderNavbar = (initialEntry = '/') =>
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Navbar />
            <LocationProbe />
          </MemoryRouter>
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

describe('Navbar - mobile drawer accessibility', () => {
  it('traps focus and restores it to the menu trigger on dismissal', async () => {
    renderNavbar();

    const trigger = screen.getByRole('button', { name: 'Open Menu' });
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Main navigation' });
    const closeButton = within(dialog).getByRole('button', { name: 'Close Menu' });
    const contactButton = within(dialog).getByTestId('mobile-nav-contact');

    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(contactButton);

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Main navigation' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('hides background controls from assistive technology while the drawer is open', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));

    expect(screen.getByRole('dialog', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Toggle Theme' })).toBeNull();
  });

  it('restores focus to desktop navigation after breakpoint dismissal', async () => {
    renderNavbar();
    const trigger = screen.getByRole('button', { name: 'Open Menu' });
    const originalInnerWidth = window.innerWidth;

    fireEvent.click(trigger);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 768 });
    fireEvent(window, new Event('resize'));

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });

    expect(screen.queryByRole('dialog', { name: 'Main navigation' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('nav-projects')));
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

  it('routes section navigation through the home hash from a detail page', () => {
    const { getByTestId } = renderNavbar('/projects/rate-limiter');
    fireEvent.click(getByTestId('nav-contact'));

    expect(screen.getByTestId('location').textContent).toBe('/#contact');
  });
});

// ─── Language selector ─────────────────────────────────────────────────────────

describe('Navbar - language selector', () => {
  beforeEach(() => localStorage.removeItem('portfolio_lang'));

  it('names each language in its native language', () => {
    renderNavbar();
    const select = screen.getByRole('combobox', { name: 'Language' }) as HTMLSelectElement;
    expect(Array.from(select.options).map(option => [option.value, option.text, option.lang])).toEqual([
      ['pt', 'Português', 'pt'], ['en', 'English', 'en'], ['es', 'Español', 'es'],
    ]);
  });

  it('localizes the label, updates navigation and remembers the selection', () => {
    const { unmount } = renderNavbar();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'es' } });
    expect((screen.getByRole('combobox', { name: 'Idioma' }) as HTMLSelectElement).value).toBe('es');
    expect(screen.getByTestId('nav-projects').textContent).toBe('Proyectos');
    expect(document.documentElement.lang).toBe('es');
    expect(localStorage.getItem('portfolio_lang')).toBe('es');
    unmount();
    renderNavbar();
    expect((screen.getByRole('combobox', { name: 'Idioma' }) as HTMLSelectElement).value).toBe('es');
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
