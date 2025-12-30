// Import translations directly as modules
import enTranslations from '@/public/locales/en.json';
import esTranslations from '@/public/locales/es.json';

type Translations = Record<string, any>;

const translationsMap: Record<string, Translations> = {
  en: enTranslations,
  es: esTranslations,
};

/**
 * Load translations for a given locale (server-side)
 */
export async function loadTranslations(locale: string): Promise<Translations> {
  try {
    const normalizedLocale = locale.toLowerCase();
    const translations = translationsMap[normalizedLocale] || translationsMap['en'];

    if (!translations) {
      console.error(`Failed to load translations for locale ${locale}, using empty object`);
      return {};
    }

    return translations;
  } catch (error) {
    console.error(`Failed to load translations for locale ${locale}:`, error);
    // Fallback to English if locale not found
    if (locale !== 'en') {
      return loadTranslations('en');
    }
    return {};
  }
}

/**
 * Get a translated string from the translations object
 * Supports nested keys like "resetPassword.email.subject"
 * Supports variable replacement like {firstName}, {year}, etc.
 */
export function t(
  translations: Translations,
  key: string,
  variables?: Record<string, string>
): string {
  const keys = key.split('.');
  let value: any = translations;

  // Navigate through nested keys
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Replace variables in the string
  if (variables) {
    return Object.entries(variables).reduce((str, [varKey, varValue]) => {
      return str.replace(new RegExp(`\\{${varKey}\\}`, 'g'), varValue);
    }, value);
  }

  return value;
}
