import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en/translation.json'
import am from './am/translation.json'

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' }
] as const

export type LanguageCode = (typeof supportedLanguages)[number]['code']

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
