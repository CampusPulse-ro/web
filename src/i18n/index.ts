/**
 * Translations. Every user-facing text lives in `en.json` and `ro.json` under the same key;
 * components read it with `useTranslation()`. English is the default (the browser's
 * language is deliberately not used); the user's choice is remembered on this device.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import roJson from './ro.json'

/** Romanian must have every key English has: a missing one is a type error here. */
const ro: typeof en = roJson

export const languages = ['en', 'ro'] as const
export type Language = (typeof languages)[number]
export const defaultLanguage: Language = 'en'

const storageKey = 'campuspulse.language'

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (languages as readonly string[]).includes(value)
}

function savedLanguage(): Language {
  try {
    const value = localStorage.getItem(storageKey)
    return isLanguage(value) ? value : defaultLanguage
  } catch {
    return defaultLanguage // storage blocked (private mode, disabled cookies): use the default
  }
}

export const resources = {
  en: { translation: en },
  ro: { translation: ro },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage(),
  fallbackLng: defaultLanguage,
  supportedLngs: languages,
  // The resources are bundled, so initialise synchronously: the first render is translated.
  initAsync: false,
  interpolation: { escapeValue: false }, // React escapes already
  returnNull: false,
})

document.documentElement.lang = i18n.language
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

/** The language currently shown. */
export function currentLanguage(): Language {
  return isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : defaultLanguage
}

/** Switch the UI language and remember it on this device. */
export function setLanguage(language: Language): void {
  void i18n.changeLanguage(language)
  try {
    localStorage.setItem(storageKey, language)
  } catch {
    // storage blocked: the choice lasts for this visit only
  }
}

export default i18n
