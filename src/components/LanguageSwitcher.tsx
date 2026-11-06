import { useTranslation } from 'react-i18next'

import { cn } from '../design-system/cn'

/** Segmented EN / አማ language toggle used in the app shell. */
export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language

  const options = [
    { code: 'en', label: 'EN' },
    { code: 'am', label: 'አማ' }
  ] as const

  return (
    <div className="flex items-center rounded-md border border-border p-0.5" role="group" aria-label="Language">
      {options.map((opt) => {
        const active = current === opt.code
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => i18n.changeLanguage(opt.code)}
            aria-pressed={active}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors',
              active ? 'bg-primary text-white' : 'text-secondary hover:text-text'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
