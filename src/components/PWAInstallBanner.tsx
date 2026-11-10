/**
 * PWAInstallBanner — shows the browser's native "Add to Home Screen" prompt
 * as a friendly in-app banner. Dismissed state persists to localStorage.
 */
import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'mela_pwa_banner_dismissed'

export function PWAInstallBanner() {
  const { t } = useTranslation()
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible,     setVisible]     = useState(false)

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !promptEvent) return null

  async function handleInstall() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setVisible(false)
      localStorage.setItem(DISMISSED_KEY, '1')
    }
  }

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  return (
    <div
      role="banner"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-layer sm:left-auto sm:right-4 sm:w-80"
      style={{ boxShadow: '0 4px 24px rgba(18,61,53,0.15)' }}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary">
        <img src="/Logo.svg" alt="MELA" className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text">{t('pwa.installTitle')}</p>
        <p className="text-xs text-secondary">{t('pwa.installDesc')}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Download className="h-3.5 w-3.5" />
          {t('pwa.install')}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('common.close')}
          className="rounded-lg p-1.5 text-muted hover:text-text transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
