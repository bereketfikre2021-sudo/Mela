/**
 * PWAInstallBanner
 *
 * Android/Chrome: uses the beforeinstallprompt event (native prompt).
 * iOS Safari:     shows manual instructions since iOS doesn't fire
 *                 beforeinstallprompt — user must use Share → Add to Home Screen.
 */
import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'mela_pwa_banner_dismissed'

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPad on iOS 13+ reports as MacIntel with touch
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

export function PWAInstallBanner() {
  const { t } = useTranslation()
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS,     setShowIOS]     = useState(false)
  const [visible,     setVisible]     = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (isInStandaloneMode()) return

    if (isIOS()) {
      // Show iOS instructions after a short delay
      const t = setTimeout(() => { setShowIOS(true); setVisible(true) }, 3000)
      return () => clearTimeout(t)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible) return null

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  async function handleInstall() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') dismiss()
  }

  return (
    <div
      role="banner"
      className="fixed bottom-20 left-3 right-3 z-50 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-layer sm:left-auto sm:right-4 sm:w-80"
    >
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
        <img src="/Logo.svg" alt="MELA" className="h-6 w-6" />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">{t('pwa.installTitle')}</p>
        {showIOS ? (
          <p className="mt-0.5 text-xs text-secondary">
            Tap <Share className="inline h-3.5 w-3.5" /> then <strong>"Add to Home Screen"</strong>
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-secondary">{t('pwa.installDesc')}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {!showIOS && (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            {t('pwa.install')}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('common.close')}
          className="rounded-lg p-1.5 text-muted transition-colors hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
