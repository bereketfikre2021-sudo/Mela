import { useTranslation } from 'react-i18next'

export function ContactPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
      <h1 className="heading text-3xl">{t('legal.contact.title')}</h1>
      <p className="mt-2 text-sm text-secondary">{t('legal.contact.subtitle')}</p>
      <div className="mt-8 space-y-4">
        {[
          { label: t('legal.contact.email'),   value: 'support@solution.pro.et', href: 'mailto:support@solution.pro.et' },
          { label: t('legal.contact.hours'),   value: t('legal.contact.hoursValue'),   href: null },
          { label: t('legal.contact.address'), value: t('legal.contact.addressValue'), href: null },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{item.label}</p>
            {item.href ? (
              <a href={item.href} className="mt-1 block text-sm text-primary hover:underline">{item.value}</a>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-text">{item.value}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

