'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import enTranslations from '@/public/locales/en.json';
import esTranslations from '@/public/locales/es.json';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations map
const translationsMap: Record<Language, Record<string, any>> = {
  en: enTranslations,
  es: esTranslations,
};

// Detect browser language
const detectBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';

  // Check localStorage first
  const savedLanguage = localStorage.getItem('preferred-language') as Language;
  if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'es')) {
    return savedLanguage;
  }

  // Detect from browser
  const browserLang = navigator.language.toLowerCase();

  // Check if it's Spanish
  if (browserLang.startsWith('es')) {
    return 'es';
  }

  // Default to English
  return 'en';
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Detect initial language from browser/localStorage
  const initialLanguage = typeof window !== 'undefined' ? detectBrowserLanguage() : 'en';

  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [translations, setTranslations] = useState<Record<string, any>>(
    translationsMap[initialLanguage]
  );

  // Update translations when language changes
  useEffect(() => {
    setTranslations(translationsMap[language]);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferred-language', lang);
  };

  // Translation function with nested key support
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
