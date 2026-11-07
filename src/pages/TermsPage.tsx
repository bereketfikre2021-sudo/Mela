/** Terms of Service — required for Google OAuth app review. */
export function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
      <h1 className="heading text-3xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-secondary">Last updated: November 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-secondary">
        <section>
          <h2 className="text-base font-semibold text-text">1. Acceptance of Terms</h2>
          <p className="mt-2">
            By creating an account and using MELA, you agree to these Terms of Service. If you do
            not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">2. Description of Service</h2>
          <p className="mt-2">
            MELA is a business management application designed for Ethiopian small businesses. It
            provides tools for recording sales, managing inventory, tracking expenses, and reviewing
            business performance.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">3. Your Account</h2>
          <p className="mt-2">
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activity that occurs under your account. Notify us immediately of any
            unauthorised use.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">4. Your Data</h2>
          <p className="mt-2">
            You retain ownership of all business data you enter into MELA. You grant us a limited
            licence to store and process your data solely for the purpose of providing the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">5. Prohibited Use</h2>
          <p className="mt-2">
            You must not use MELA for any unlawful purpose, to upload malicious content, or to
            attempt to gain unauthorised access to other users' data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">6. Limitation of Liability</h2>
          <p className="mt-2">
            MELA is provided "as is". We are not liable for any indirect or consequential loss
            arising from your use of the service. Financial figures shown are based on data you
            enter and should not be used as the sole basis for business decisions without
            independent verification.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">7. Contact</h2>
          <p className="mt-2">
            Questions about these terms? Email{' '}
            <a href="mailto:support@mela.pro.et" className="text-primary hover:underline">
              support@mela.pro.et
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
