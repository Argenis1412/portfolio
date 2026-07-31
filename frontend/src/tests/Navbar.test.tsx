/**
 * Quality tests for Navbar component.
 *
 * Verifies rendering, navigation links, language selector and theme button.
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
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
  it('traps focus and restores it to the menu trigger on dismissal', () => {
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
    expect(document.activeElement).toBe(trigger);
  });

  it('hides background controls from assistive technology while the drawer is open', () => {
    renderNavbar();

    fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));

    expect(screen.getByRole('dialog', { name: 'Main navigation' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Toggle Theme' })).toBeNull();
  });

  it('restores focus to desktop navigation after breakpoint dismissal', () => {
    renderNavbar();
    const trigger = screen.getByRole('button', { name: 'Open Menu' });
    const originalInnerWidth = window.innerWidth;

    fireEvent.click(trigger);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 768 });
    fireEvent(window, new Event('resize'));

    expect(screen.queryByRole('dialog', { name: 'Main navigation' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('nav-projects'));

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
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
