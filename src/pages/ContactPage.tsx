/** Contact page — required for Google OAuth app review. */
export function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
      <h1 className="heading text-3xl">Contact Us</h1>
      <p className="mt-2 text-sm text-secondary">
        We're here to help. Reach out with questions, feedback, or support requests.
      </p>

      <div className="mt-8 space-y-4 text-sm text-secondary">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="font-semibold text-text">Email</p>
          <a href="mailto:support@mela.pro.et" className="mt-1 block text-primary hover:underline">
            support@mela.pro.et
          </a>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="font-semibold text-text">Business hours</p>
          <p className="mt-1">Monday – Friday, 9:00 AM – 6:00 PM EAT (UTC+3)</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="font-semibold text-text">Mailing address</p>
          <p className="mt-1 leading-relaxed">
            MELA Business Software<br />
            Addis Ababa, Ethiopia
          </p>
        </div>
      </div>
    </div>
  )
}
