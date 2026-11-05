import { ArrowRight, Boxes, LineChart, ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'

export interface WelcomePageProps {
  onExplore: () => void
}

/** On-brand welcome screen demonstrating the design tokens and typography. */
export function WelcomePage({ onExplore }: WelcomePageProps) {
  const { t } = useTranslation()

  const features = [
    { icon: ShoppingBag, title: t('welcome.features.sales.title'), desc: t('welcome.features.sales.desc') },
    { icon: Boxes, title: t('welcome.features.inventory.title'), desc: t('welcome.features.inventory.desc') },
    { icon: LineChart, title: t('welcome.features.insights.title'), desc: t('welcome.features.insights.desc') }
  ]

  return (
    <div className="py-6 md:py-10">
      <p className="text-sm font-medium uppercase tracking-wider text-primary">{t('welcome.eyebrow')}</p>
      <h1 className="heading mt-3 max-w-2xl text-3xl md:text-4xl">{t('welcome.title')}</h1>
      <p className="mt-4 max-w-xl text-base text-muted">{t('welcome.subtitle')}</p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Button size="lg" onClick={onExplore} trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
          {t('welcome.cta')}
        </Button>
        <Button variant="secondary" size="lg" onClick={onExplore}>
          {t('welcome.secondary')}
        </Button>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
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
              <p className="mt-1 text-sm text-muted">{f.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
