import { Sun, Moon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/useApi';
import { fetchAbout, fetchProjects, fetchSkills, fetchExperience } from '../api';
import { scrollToSection } from '../utils/scrollToSection';

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const prefetch = (key: readonly unknown[], fn: () => Promise<unknown>) => {
    queryClient.prefetchQuery({
      queryKey: key,
      queryFn: fn,
      staleTime: 20 * 60 * 1000,
    });
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 hidden md:block">
            {/* Optional logo or leave empty. Kept div for flex spacing. */}
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-6">
              <button
                onClick={() => scrollToSection('hero')}
                onMouseEnter={() => prefetch(queryKeys.about, fetchAbout)}
                onFocus={() => prefetch(queryKeys.about, fetchAbout)}
                className="hover:text-app-primary px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors text-app-text"
              >
                {t('nav.about')}
              </button>
              <button
                onClick={() => scrollToSection('stack')}
                onMouseEnter={() => prefetch(queryKeys.skills, fetchSkills)}
                onFocus={() => prefetch(queryKeys.skills, fetchSkills)}
                className="hover:text-app-primary px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors text-app-text"
              >
                {t('nav.stack')}
              </button>
              <button
                onClick={() => scrollToSection('projects')}
                onMouseEnter={() => prefetch(queryKeys.projects, fetchProjects)}
                onFocus={() => prefetch(queryKeys.projects, fetchProjects)}
                className="hover:text-app-primary px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors text-app-text"
              >
                {t('nav.projects')}
              </button>
              <button
                onClick={() => scrollToSection('experience')}
                onMouseEnter={() => prefetch(queryKeys.experience, fetchExperience)}
                onFocus={() => prefetch(queryKeys.experience, fetchExperience)}
                className="hover:text-app-primary px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors text-app-text"
              >
                {t('nav.journey')}
              </button>
              <button
                data-testid="nav-contact"
                onClick={() => scrollToSection('contato')}
                className="hover:text-app-primary px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors text-app-text"
              >
                {t('nav.contact')}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-app-surface-hover transition-colors text-app-text"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'pt' | 'en' | 'es')}
              className="bg-app-surface border border-app-border text-sm rounded-lg focus:ring-app-primary focus:border-app-primary block p-2 transition-smooth shadow-sm text-app-text"
            >
              <option value="pt">PT</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </div>
        </div>
      </div>
    </nav>
  );
}
