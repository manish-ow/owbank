'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from './locales/en.json';
import id from './locales/id.json';

export type Locale = 'en' | 'id';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
};

const translations: Record<Locale, typeof en> = { en, id };

type TranslationKeys = typeof en;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (section: keyof TranslationKeys, key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: () => '',
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('ow-locale') as Locale | null;
    if (saved && translations[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('ow-locale', newLocale);
  }, []);

  const t = useCallback(
    (section: keyof TranslationKeys, key: string): string => {
      const sectionData = (translations[locale] as any)?.[section];
      if (sectionData && key in sectionData) {
        return sectionData[key];
      }
      // Fallback to English
      const fallback = (translations['en'] as any)?.[section];
      if (fallback && key in fallback) {
        return fallback[key];
      }
      return key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}

export default I18nContext;
