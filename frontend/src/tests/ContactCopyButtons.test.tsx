import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactCopyButtons from '../components/ui/ContactCopyButtons';
import { LanguageProvider } from '../context/LanguageContext';

describe('contact copy controls', () => {
  beforeEach(() => localStorage.clear());

  it.each([
    ['Copy email', 'portfolio@example.invalid'],
    ['Copy phone', '+5500000000000'],
  ])('preserves the %s action after moving it into contact', async (label, value) => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    render(
      <LanguageProvider>
        <ContactCopyButtons email="portfolio@example.invalid" phone="+5500000000000" />
      </LanguageProvider>,
    );

    await user.click(screen.getByRole('button', { name: label }));

    expect(writeText).toHaveBeenCalledWith(value);
    expect(screen.getByRole('status').textContent).toBe('Copied');
    writeText.mockRestore();
  });
});
