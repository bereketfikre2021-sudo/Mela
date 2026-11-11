import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingBag, Boxes, Wallet, LineChart, ArrowRight, CheckCircle2 } from 'lucide-react'

import { Button } from '../design-system/Button'

export function WelcomePage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const features = [
    { icon: ShoppingBag, title: t('welcome.features.sales.title'),     desc: t('welcome.features.sales.desc') },
    { icon: Boxes,       title: t('welcome.features.inventory.title'), desc: t('welcome.features.inventory.desc') },
    { icon: Wallet,      title: t('welcome.features.expenses.title'),  desc: t('welcome.features.expenses.desc') },
    { icon: LineChart,   title: t('welcome.features.insights.title'),  desc: t('welcome.features.insights.desc') },
  ]

  return (
    <div className="overflow-x-hidden">

      {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Full-width dark green hero â€” no max-width constraint because the shell
          renders this page without px-4/max-w-5xl (fullWidth prop). */}
      <section className="relative bg-primary">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-16 md:grid-cols-2 md:items-center md:py-24 lg:px-8">

          {/* Left â€” copy */}
          <div className="relative z-10">
            {/* Eyebrow pill */}
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
              {t('welcome.eyebrow')}
            </span>

            {/* Headline */}
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-6xl">
              {t('welcome.title')}
            </h1>

            {/* Subheading */}
            <p className="mt-5 max-w-md text-lg font-medium leading-relaxed text-white/90">
              {t('welcome.subheading')}
            </p>

            {/* Description */}
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
              {t('welcome.description')}
            </p>

            {/* CTA */}
            <div className="mt-8">
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                className="rounded-xl bg-white font-semibold text-primary shadow-none hover:bg-primary-soft"
              >
                {t('welcome.cta')}
              </Button>
            </div>

            {/* Trust checklist */}
            <ul className="mt-8 space-y-2">
              {(t('welcome.checks', { returnObjects: true }) as string[]).map(c => (
                <li key={c} className="flex items-center gap-2 text-sm text-white/75">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Right â€” app preview mockup */}
          <div className="relative flex justify-center md:justify-end">
            {/* Glow */}
            <div className="pointer-events-none absolute -inset-10 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />

            {/* Phone shell */}
            <div className="relative w-[260px] overflow-hidden rounded-[2rem] border-4 border-white/20 bg-background shadow-layer md:w-[280px]">

              {/* Phone status bar â€” uses real Logo.svg */}
              <div className="flex items-center justify-between bg-primary px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <img src="/Logo.svg" alt="MELA" className="h-6 w-6 rounded-md" />
                  <span className="text-xs font-bold text-white tracking-wide">MELA</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
                  <div className="h-1.5 w-3 rounded-full bg-white/50" />
                </div>
              </div>

              {/* Mock screen */}
              <div className="space-y-2.5 px-3 pb-4 pt-3">
                {/* Greeting skeleton */}
                <div>
                  <div className="h-2.5 w-28 rounded bg-text/10" />
                  <div className="mt-1 h-4 w-36 rounded bg-text/15" />
                </div>
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Revenue',    val: 'ETB 4,200', cls: 'bg-primary-soft' },
                    { label: 'Expenses',   val: 'ETB 1,650', cls: 'bg-danger-soft'  },
                    { label: 'Net Profit', val: 'ETB 2,550', cls: 'bg-success-soft' },
                    { label: 'Pending',    val: 'ETB 800',   cls: 'bg-warning-soft' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-lg ${s.cls} p-2.5`}>
                      <p className="text-[9px] font-medium uppercase tracking-wide text-secondary">{s.label}</p>
                      <p className="mt-0.5 text-xs font-bold text-figures text-text">{s.val}</p>
                    </div>
                  ))}
                </div>
                {/* Mini bar chart */}
                <div className="rounded-lg border border-border bg-surface p-2.5">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-secondary">Revenue vs Expenses</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Revenue',  val: 'ETB 4.2K', w: '85%', bg: 'bg-primary-soft', fill: 'bg-primary' },
                      { label: 'Expenses', val: 'ETB 1.6K', w: '38%', bg: 'bg-danger-soft',  fill: 'bg-danger'  },
                    ].map(b => (
                      <div key={b.label}>
                        <div className="mb-0.5 flex justify-between text-[8px] text-secondary">
                          <span>{b.label}</span><span>{b.val}</span>
                        </div>
                        <div className={`h-1.5 rounded-full ${b.bg}`}>
                          <div className={`h-full rounded-full ${b.fill}`} style={{ width: b.w }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Recent sales */}
                <div className="overflow-hidden rounded-lg border border-border bg-surface">
                  <div className="border-b border-border px-2.5 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-secondary">Recent Sales</p>
                  </div>
                  {['ETB 450', 'ETB 1,200', 'ETB 680'].map(amt => (
                    <div key={amt} className="flex items-center justify-between border-b border-border px-2.5 py-1.5 last:border-0">
                      <div className="h-1.5 w-20 rounded bg-text/10" />
                      <span className="text-[8px] font-bold text-figures text-primary">{amt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ FEATURES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24 lg:px-8">
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {t('welcome.featuresEyebrow')}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-text md:text-4xl">
            {t('welcome.featuresTitle')}
          </h2>
          <p className="mt-3 max-w-xl text-base text-secondary">
            {t('welcome.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f, i) => {
            const Icon = f.icon
            const wide = i === 0 || i === 3
            return (
              <div
                key={f.title}
                className={[
                  'group relative overflow-hidden rounded-2xl border border-border bg-surface p-6',
                  'transition-shadow hover:shadow-layer',
                  wide ? 'sm:col-span-2' : '',
                ].join(' ')}
              >
                <span className="pointer-events-none absolute right-5 top-5 select-none text-6xl font-black leading-none text-text/[0.04]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold leading-snug text-text">{f.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">{f.desc}</p>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" aria-hidden="true" />
              </div>
            )
          })}
        </div>
      </section>

      {/* â”€â”€ CTA STRIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-primary">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center md:flex-row md:justify-between md:text-left lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              {t('welcome.ctaTitle')}
            </h2>
            <p className="mt-1 text-sm text-white/70">
              {t('welcome.ctaSubtitle')}
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            className="shrink-0 rounded-xl bg-white font-semibold text-primary shadow-none hover:bg-primary-soft"
          >
            {t('welcome.cta')}
          </Button>
        </div>
      </section>

      {/* â”€â”€ FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">

          {/* Desktop: 4-column grid */}
          <div className="hidden gap-8 md:grid md:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <img src="/Logo.svg" alt="MELA" className="h-8 w-8" />
                <span className="text-base font-semibold tracking-tight text-text">MELA</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-secondary">{t('footer.tagline')}</p>
            </div>
            {/* Product */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary">{t('footer.product')}</p>
              <ul className="space-y-2 text-sm text-secondary">
                <li><a href="/login" className="hover:text-primary">{t('footer.getStarted')}</a></li>
                <li><a href="/login" className="hover:text-primary">{t('footer.signIn')}</a></li>
              </ul>
            </div>
            {/* Legal */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary">{t('footer.legal')}</p>
              <ul className="space-y-2 text-sm text-secondary">
                <li><a href="/privacy" className="hover:text-primary">{t('footer.privacy')}</a></li>
                <li><a href="/terms"   className="hover:text-primary">{t('footer.terms')}</a></li>
                <li><a href="/contact" className="hover:text-primary">{t('footer.contact')}</a></li>
              </ul>
            </div>
            {/* Support */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary">{t('footer.support')}</p>
              <ul className="space-y-2 text-sm text-secondary">
                <li>
                  <a href="https://t.me/Believeandforward" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    @Believeandforward
                  </a>
                </li>
                <li><a href="mailto:support@solution.pro.et" className="hover:text-primary">support@solution.pro.et</a></li>
              </ul>
            </div>
          </div>

          {/* Mobile: logo + legal links only */}
          <div className="flex flex-col items-center gap-4 md:hidden">
            <div className="flex items-center gap-2">
              <img src="/Logo.svg" alt="MELA" className="h-7 w-7" />
              <span className="text-sm font-semibold text-text">MELA</span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-secondary">
              <a href="/privacy" className="hover:text-primary">{t('footer.privacy')}</a>
              <a href="/terms"   className="hover:text-primary">{t('footer.terms')}</a>
              <a href="/contact" className="hover:text-primary">{t('footer.contact')}</a>
            </div>
          </div>

          {/* Copyright row */}
          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted md:flex md:items-center md:justify-between md:text-left">
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
            <div className="mt-3 hidden gap-4 md:flex">
              <a href="/privacy" className="hover:text-secondary">{t('footer.privacy')}</a>
              <a href="/terms"   className="hover:text-secondary">{t('footer.terms')}</a>
              <a href="/contact" className="hover:text-secondary">{t('footer.contact')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

