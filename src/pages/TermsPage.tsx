import { useTranslation } from 'react-i18next'

export function TermsPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
      <h1 className="heading text-3xl">{t('legal.terms.title')}</h1>
      <p className="mt-2 text-sm text-secondary">{t('legal.terms.updated')}</p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-secondary">
        {[
          { h: '1. Acceptance of Terms', b: 'By creating an account and using MELA, you agree to these Terms of Service. If you do not agree, please do not use the service.' },
          { h: '2. Description of Service', b: 'MELA is a business management application designed for Ethiopian small businesses. It provides tools for recording sales, managing inventory, tracking expenses, and reviewing business performance.' },
          { h: '3. Your Account', b: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorised use.' },
          { h: '4. Your Data', b: 'You retain ownership of all business data you enter into MELA. You grant us a limited licence to store and process your data solely for the purpose of providing the service.' },
          { h: '5. Prohibited Use', b: 'You must not use MELA for any unlawful purpose, to upload malicious content, or to attempt to gain unauthorised access to other users\' data.' },
          { h: '6. Limitation of Liability', b: 'MELA is provided "as is". We are not liable for any indirect or consequential loss arising from your use of the service.' },
          { h: '7. Contact', b: null },
        ].map(s => (
          <section key={s.h}>
            <h2 className="text-base font-semibold text-text">{s.h}</h2>
            {s.b ? (
              <p className="mt-2">{s.b}</p>
            ) : (
              <p className="mt-2">
                Questions? Email{' '}
                <a href="mailto:support@solution.pro.et" className="text-primary hover:underline">support@solution.pro.et</a>.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

