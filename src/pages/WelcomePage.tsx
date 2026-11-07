import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ShoppingBag,
  Boxes,
  Wallet,
  LineChart,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

import { Button } from '../design-system/Button'

/** On-brand MELA welcome / marketing page. */
export function WelcomePage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const features = [
    {
      icon: ShoppingBag,
      title: t('welcome.features.sales.title'),
      desc:  t('welcome.features.sales.desc'),
    },
    {
      icon: Boxes,
      title: t('welcome.features.inventory.title'),
      desc:  t('welcome.features.inventory.desc'),
    },
    {
      icon: Wallet,
      title: t('welcome.features.expenses.title'),
      desc:  t('welcome.features.expenses.desc'),
    },
    {
      icon: LineChart,
      title: t('welcome.features.insights.title'),
      desc:  t('welcome.features.insights.desc'),
    },
  ]

  const checks = [
    'No accounting degree required',
    'Works offline on any device',
    'English and Amharic interface',
    'Built for Ethiopian businesses',
  ]

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      {/*
        -mt-6 md:-mt-10 bleeds the section up into the AppShell's pt-6/pt-10
        padding so the dark background covers the full viewport from the top bar
        down, eliminating the white gap.
      */}
      <section className="relative -mx-4 -mt-6 md:-mt-10 px-4 pt-6 md:pt-10">

        {/* Full dark green background flush with top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[35%] bg-primary md:bottom-[30%]" aria-hidden="true" />

        <div className="mx-auto max-w-5xl px-4 pb-0 pt-12 md:pt-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-end">

            {/* ── Left — copy ────────────────────────────────────────────── */}
            <div className="pb-8 md:pb-16">
              {/* Eyebrow */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-widest text-white/80 uppercase">
                {t('welcome.eyebrow')}
              </span>

              {/* Headline */}
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-6xl">
                {t('welcome.title')}
              </h1>

              {/* Subheading — solid white, clearly readable */}
              <p className="mt-5 text-lg font-medium leading-relaxed text-white/90">
                {t('welcome.subheading')}
              </p>

              {/* Body description — slightly muted but still readable */}
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {t('welcome.description')}
              </p>

              {/* CTA */}
              <div className="mt-8">
                <Button
                  size="lg"
                  onClick={() => navigate('/login')}
                  trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  className="bg-white text-primary hover:bg-primary-soft font-semibold shadow-none"
                >
                  {t('welcome.cta')}
                </Button>
              </div>

              {/* Trust checks */}
              <ul className="mt-8 space-y-2">
                {checks.map(c => (
                  <li key={c} className="flex items-center gap-2 text-sm text-white/75">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Right — app preview mockup (pure CSS) ─────────────────── */}
            <div className="relative mx-auto w-full max-w-sm pb-0 md:mx-0 md:max-w-none">
              {/* Phone frame */}
              <div className="relative mx-auto w-64 md:w-72">
                {/* Glow behind the phone */}
                <div
                  className="absolute -inset-8 -z-10 rounded-full bg-primary-soft/20 blur-3xl"
                  aria-hidden="true"
                />
                {/* The phone shell */}
                <div className="overflow-hidden rounded-[2rem] border-4 border-white/20 bg-background shadow-layer">
                  {/* Status bar */}
                  <div className="flex items-center justify-between bg-primary px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-md bg-white/20" />
                      <span className="text-xs font-semibold text-white">MELA</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
                      <div className="h-1.5 w-3 rounded-full bg-white/50" />
                    </div>
                  </div>

                  {/* Mock screen content */}
                  <div className="px-3 pb-4 pt-3 space-y-2.5">
                    {/* Greeting */}
                    <div>
                      <div className="h-2.5 w-28 rounded bg-text/10" />
                      <div className="mt-1 h-4 w-36 rounded bg-text/15" />
                    </div>
                    {/* Stat cards row */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Revenue', val: 'ETB 4,200', accent: 'bg-primary-soft' },
                        { label: 'Expenses', val: 'ETB 1,650', accent: 'bg-danger-soft' },
                        { label: 'Net Profit', val: 'ETB 2,550', accent: 'bg-success-soft' },
                        { label: 'Pending', val: 'ETB 800', accent: 'bg-warning-soft' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-lg ${s.accent} p-2.5`}>
                          <p className="text-[9px] font-medium uppercase tracking-wide text-secondary">{s.label}</p>
                          <p className="mt-0.5 text-xs font-bold text-text text-figures">{s.val}</p>
                        </div>
                      ))}
                    </div>
                    {/* Mini bar chart */}
                    <div className="rounded-lg border border-border bg-surface p-2.5">
                      <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-secondary">Revenue vs Expenses</p>
                      <div className="space-y-1.5">
                        <div>
                          <div className="mb-0.5 flex justify-between text-[8px] text-secondary">
                            <span>Revenue</span><span>ETB 4.2K</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-primary-soft">
                            <div className="h-full w-[85%] rounded-full bg-primary" />
                          </div>
                        </div>
                        <div>
                          <div className="mb-0.5 flex justify-between text-[8px] text-secondary">
                            <span>Expenses</span><span>ETB 1.6K</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-danger-soft">
                            <div className="h-full w-[38%] rounded-full bg-danger" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Recent sales list */}
                    <div className="rounded-lg border border-border bg-surface">
                      <div className="border-b border-border px-2.5 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-secondary">Recent Sales</p>
                      </div>
                      {[
                        { ref: 'S-20241107-3821', amt: 'ETB 450' },
                        { ref: 'S-20241107-2914', amt: 'ETB 1,200' },
                        { ref: 'S-20241106-7743', amt: 'ETB 680' },
                      ].map(s => (
                        <div key={s.ref} className="flex items-center justify-between px-2.5 py-1.5 border-b border-border last:border-0">
                          <div className="h-1.5 w-20 rounded bg-text/10" />
                          <span className="text-[8px] font-bold text-figures text-primary">{s.amt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">

        {/* Section label */}
        <div className="mb-12 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Everything in one place
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-text md:text-4xl">
            Built for how Ethiopian<br className="hidden md:block" /> businesses actually work
          </h2>
          <p className="mt-3 max-w-xl text-base text-secondary mx-auto md:mx-0">
            {t('welcome.description')}
          </p>
        </div>

        {/* Feature grid — alternating large/small cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f, i) => {
            const Icon = f.icon
            const isLarge = i === 0 || i === 3  // first and last span full width on sm
            return (
              <div
                key={f.title}
                className={[
                  'group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-shadow hover:shadow-layer',
                  isLarge ? 'sm:col-span-2' : '',
                ].join(' ')}
              >
                {/* Number indicator */}
                <span className="absolute right-5 top-5 text-6xl font-black text-text/[0.04] select-none leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Icon */}
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <h3 className="text-lg font-semibold leading-snug text-text">{f.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">{f.desc}</p>

                {/* Bottom accent line on hover */}
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" aria-hidden="true" />
              </div>
            )
          })}
        </div>
      </section>

      {/* ── BOTTOM CTA STRIP ─────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-primary">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4 py-14 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Ready to take control?
            </h2>
            <p className="mt-1 text-sm text-primary-soft/70">
              Set up in under 5 minutes. No credit card required.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            className="shrink-0 bg-white text-primary hover:bg-primary-soft font-semibold shadow-none"
          >
            {t('welcome.cta')}
          </Button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-10">

          {/* Top row: brand + nav columns */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <img src="/Logo.svg" alt="MELA" className="h-8 w-8" />
                <span className="text-base font-semibold tracking-tight text-text">MELA</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Ethiopian-first small business management. Sales, inventory and insights in one place.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-secondary">Product</p>
              <ul className="space-y-2 text-sm text-secondary">
                <li><a href="/login" className="hover:text-primary">Get started</a></li>
                <li><a href="/login" className="hover:text-primary">Sign in</a></li>
              </ul>
            </div>

            {/* Legal — required for Google OAuth app review */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-secondary">Legal</p>
              <ul className="space-y-2 text-sm text-secondary">
                <li><a href="/privacy" className="hover:text-primary">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-primary">Terms of Service</a></li>
                <li><a href="/contact" className="hover:text-primary">Contact</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-secondary">Support</p>
              <ul className="space-y-2 text-sm text-secondary">
                <li><a href="/contact" className="hover:text-primary">Help & Support</a></li>
                <li><a href="mailto:support@mela.pro.et" className="hover:text-primary">support@mela.pro.et</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom row: copyright */}
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted md:flex-row">
            <p>© {new Date().getFullYear()} MELA. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="/privacy" className="hover:text-secondary">Privacy</a>
              <a href="/terms" className="hover:text-secondary">Terms</a>
              <a href="/contact" className="hover:text-secondary">Contact</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
