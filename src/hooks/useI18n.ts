import { useState, useEffect } from 'react';
import enTranslations from '../i18n/en.json';
import hiTranslations from '../i18n/hi.json';

// Simple i18n hook for the app
export function useI18n() {
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [translations, setTranslations] = useState<any>(enTranslations);

  useEffect(() => {
    // Load translations based on current language
    if (language === 'hi') {
      setTranslations(hiTranslations);
    } else {
      setTranslations(enTranslations);
    }
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    
    return typeof value === 'string' ? value : (fallback || key);
  };

  const changeLanguage = (newLanguage: 'en' | 'hi') => {
    setLanguage(newLanguage);
  };

  return {
    t,
    language,
    changeLanguage,
    isRTL: language === 'ar', // For future RTL support
  };
}
