import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// --- Tipos ---
export type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

// --- Carga de traducciones desde archivos JSON ---
// Para añadir un nuevo idioma: crear el archivo JSON en src/i18n/ e importarlo aquí.
import ptTranslations from '../i18n/pt.json';
import enTranslations from '../i18n/en.json';
import esTranslations from '../i18n/es.json';

const translations: Record<Language, Record<string, string>> = {
  pt: ptTranslations,
  en: enTranslations,
  es: esTranslations,
};

// --- Contexto ---
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getInitialLanguage = (): Language => {
    const saved = localStorage.getItem('portfolio_lang') as Language;
    if (saved && ['pt', 'en', 'es'].includes(saved)) return saved;

    const browserLang = navigator.language.split('-')[0];
    if (['pt', 'en', 'es'].includes(browserLang)) return browserLang as Language;

    return 'en';
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('portfolio_lang', lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, params?: Record<string, any>): string => {
    let text = translations[language][key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
