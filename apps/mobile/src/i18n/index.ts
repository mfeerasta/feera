/**
 * i18n bootstrap for the Feera mobile app.
 *
 * Wires i18next + react-i18next, detects the device locale via expo-localization,
 * applies RTL via I18nManager.forceRTL when the locale is Urdu or Arabic.
 *
 * Resource files for ur and ar ship with MISSING_TRANSLATION placeholders per
 * the M2 spec. Real copy lands in M6.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import {
  DEFAULT_LOCALE,
  LOCALES,
  isRtl,
  type Locale,
} from '@feera/i18n';

import en from './locales/en.json';
import ur from './locales/ur.json';
import ar from './locales/ar.json';

function pickLocale(): Locale {
  const deviceTag = getLocales()?.[0]?.languageCode ?? DEFAULT_LOCALE;
  const candidate = deviceTag.toLowerCase() as Locale;
  return (LOCALES as readonly string[]).includes(candidate)
    ? candidate
    : DEFAULT_LOCALE;
}

export function setupI18n(): Locale {
  const locale = pickLocale();
  const shouldRtl = isRtl(locale);

  if (I18nManager.isRTL !== shouldRtl) {
    I18nManager.allowRTL(shouldRtl);
    I18nManager.forceRTL(shouldRtl);
    // Note: a reload is required for layout direction to flip. Handled in M6.
  }

  void i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      ur: { translation: ur },
      ar: { translation: ar },
    },
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  return locale;
}

export { i18n };
