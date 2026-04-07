/**
 * scrollToSection
 *
 * Smooth-scrolls to a page section by its id.
 * Works correctly with a fixed navbar because every section should carry
 * `scroll-margin-top` (set globally in index.css).
 *
 * Falls back to hash navigation for environments where `scrollIntoView`
 * is unavailable (e.g. very old browsers or JSDOM in tests).
 *
 * @param id  The `id` attribute of the target section (without '#')
 */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) {
    // Fallback: native hash navigation — always works, just less smooth
    window.location.hash = `#${id}`;
    return;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
