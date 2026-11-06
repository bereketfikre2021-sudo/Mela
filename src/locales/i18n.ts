import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en/translation.json'
import am from './am/translation.json'

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' }
] as const

export type LanguageCode = (typeof supportedLanguages)[number]['code']

const STORAGE_KEY = 'mela.lang'

/**
 * Resolve the initial language: a previously chosen language persisted in
 * localStorage takes precedence, otherwise the browser language is detected
 * (Ethiopian-first product) and English is used as the fallback.
 */
function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'am') return stored
  const browser = navigator.language?.toLowerCase() ?? ''
  return browser.startsWith('am') ? 'am' : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am }
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

// Persist the active language so a reload keeps the user's choice.
i18n.on('languageChanged', (lng: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, lng)
  }
})

export default i18n
