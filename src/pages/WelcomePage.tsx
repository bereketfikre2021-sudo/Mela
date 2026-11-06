import { Boxes, LineChart, ShoppingBag, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'

/** On-brand MELA welcome screen introducing the product. */
export function WelcomePage() {
  const { t } = useTranslation()

  const features = [
    { icon: ShoppingBag, title: t('welcome.features.sales.title'), desc: t('welcome.features.sales.desc') },
    { icon: Boxes, title: t('welcome.features.inventory.title'), desc: t('welcome.features.inventory.desc') },
    { icon: Wallet, title: t('welcome.features.expenses.title'), desc: t('welcome.features.expenses.desc') },
    { icon: LineChart, title: t('welcome.features.insights.title'), desc: t('welcome.features.insights.desc') }
  ]

  return (
    <div className="py-6 md:py-10">
      <p className="text-sm font-medium uppercase tracking-wider text-primary">{t('welcome.eyebrow')}</p>
      <h1 className="heading mt-3 max-w-2xl text-3xl md:text-4xl">{t('welcome.title')}</h1>
      <p className="mt-4 max-w-xl text-base text-secondary">{t('welcome.subheading')}</p>
      <p className="mt-3 max-w-xl text-sm text-secondary">{t('welcome.description')}</p>

      {/* Disabled until onboarding is available (Phase 1). */}
      <div className="mt-7">
        <Button size="lg" disabled>
          {t('welcome.cta')}
        </Button>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <div key={f.title} className="bg-surface p-5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary"
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-text">{f.title}</h2>
              <p className="mt-1 text-sm text-secondary">{f.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
