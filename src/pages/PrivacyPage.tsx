import { useTranslation } from 'react-i18next'

export function PrivacyPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
      <h1 className="heading text-3xl">{t('legal.privacy.title')}</h1>
      <p className="mt-2 text-sm text-secondary">{t('legal.privacy.updated')}</p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-secondary">
        {[
          { h: '1. Information We Collect', b: 'MELA collects only the information necessary to provide its business management services. This includes your email address (used for authentication), business name, owner name, phone number, and the business data you enter (sales, products, expenses).' },
          { h: '2. How We Use Your Information', b: 'Your data is used solely to operate and improve MELA. We do not sell, rent, or share your personal information with third parties for marketing purposes.' },
          { h: '3. Google Sign-In', b: 'MELA offers sign-in via Google OAuth. When you use Google Sign-In, we receive your Google account email address. We do not request access to your Gmail, Drive, Contacts, or any other Google service. The scopes requested are limited to basic profile identification only.' },
          { h: '4. Data Storage', b: 'Your data is stored securely on Supabase-hosted PostgreSQL infrastructure. Access is protected by row-level security policies ensuring you can only access your own business data.' },
          { h: '5. Data Retention', b: 'Your data is retained for as long as your account is active. You may request deletion of your account and all associated data by contacting us at support@mela.pro.et.' },
          { h: '6. Contact', b: null },
        ].map(s => (
          <section key={s.h}>
            <h2 className="text-base font-semibold text-text">{s.h}</h2>
            {s.b ? (
              <p className="mt-2">{s.b}</p>
            ) : (
              <p className="mt-2">
                For privacy questions, email us at{' '}
                <a href="mailto:support@mela.pro.et" className="text-primary hover:underline">support@mela.pro.et</a>.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
