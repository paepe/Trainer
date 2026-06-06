// i18n foundation — i18next + react-i18next.
// Scope: en · pt · es · de (all LTR). Keys are nested by domain (settings.*,
// workout.*, …). Exercise/muscle names are DB content and are NOT translated here.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import de from './locales/de.json';

export const SUPPORTED_LANGS = ['en', 'pt', 'es', 'de'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

// BCP-47 tags for locale-aware APIs (voice recognition, Intl formatting).
export const BCP47: Record<AppLanguage, string> = {
  en: 'en-US', pt: 'pt-BR', es: 'es-ES', de: 'de-DE',
};

const isSupported = (l: string): l is AppLanguage =>
  (SUPPORTED_LANGS as readonly string[]).includes(l);

// First-run detection from the device; a persisted user pref overrides this
// later via i18n.changeLanguage() (wired in App.tsx).
export function detectDeviceLanguage(): AppLanguage {
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  const base = nav.slice(0, 2).toLowerCase();
  return isSupported(base) ? base : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'en-US': { translation: en },
    pt: { translation: pt },
    'pt-BR': { translation: pt },
    es: { translation: es },
    'es-ES': { translation: es },
    de: { translation: de },
    'de-DE': { translation: de },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGS],
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

export default i18n;
