/** Privacy Policy — required for Google OAuth app review. */
export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
      <h1 className="heading text-3xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-secondary">Last updated: November 2026</p>

      <div className="prose mt-8 space-y-6 text-sm leading-relaxed text-secondary">
        <section>
          <h2 className="text-base font-semibold text-text">1. Information We Collect</h2>
          <p className="mt-2">
            MELA collects only the information necessary to provide its business management services.
            This includes your email address (used for authentication), business name, owner name,
            phone number, and the business data you enter (sales, products, expenses).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">2. How We Use Your Information</h2>
          <p className="mt-2">
            Your data is used solely to operate and improve MELA. We do not sell, rent, or share
            your personal information with third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">3. Google Sign-In</h2>
          <p className="mt-2">
            MELA offers sign-in via Google OAuth. When you use Google Sign-In, we receive your
            Google account email address and display name. We do not request access to your Gmail,
            Drive, Contacts, or any other Google service. The scopes requested are limited to
            basic profile identification only.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">4. Data Storage</h2>
          <p className="mt-2">
            Your data is stored securely on Supabase-hosted PostgreSQL infrastructure. Access is
            protected by row-level security policies ensuring you can only access your own business data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">5. Data Retention</h2>
          <p className="mt-2">
            Your data is retained for as long as your account is active. You may request deletion
            of your account and all associated data by contacting us at support@mela.pro.et.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text">6. Contact</h2>
          <p className="mt-2">
            For privacy questions, email us at{' '}
            <a href="mailto:support@mela.pro.et" className="text-primary hover:underline">
              support@mela.pro.et
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
