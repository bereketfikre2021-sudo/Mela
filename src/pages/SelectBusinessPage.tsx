import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Plus, Building2 } from 'lucide-react'
import { Button } from '../design-system/Button'
import { useAuth } from '../modules/auth/AuthContext'
import { BusinessAvatar } from '../components/BusinessAvatar'

/**
 * SelectBusinessPage
 *
 * Shown after sign-in when the user owns more than one business.
 * Also shown when they click "Switch Business" from the profile menu
 * via navigation (not a modal) so deep-linking and back-button work.
 *
 * The user can also start adding a new business from here (if < 3).
 */
export function SelectBusinessPage() {
  const { t }                                        = useTranslation()
  const navigate                                     = useNavigate()
  const { businesses, activeBusiness, switchBusiness } = useAuth()
  const [switching, setSwitching]                    = useState<string | null>(null)

  async function handleSelect(id: string) {
    if (id === activeBusiness?.id) {
      navigate('/app', { replace: true })
      return
    }
    setSwitching(id)
    await switchBusiness(id)
    setSwitching(null)
    navigate('/app', { replace: true })
  }

  function handleAddBusiness() {
    navigate('/onboarding/new')
  }

  const canAddMore = businesses.length < 3

  return (
    <div className="mx-auto max-w-md py-8 md:py-12 px-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-text">{t('selectBusiness.title')}</h1>
        <p className="mt-1.5 text-sm text-secondary">{t('selectBusiness.subtitle')}</p>
      </div>

      {/* Business list */}
      <div className="space-y-3">
        {businesses.map(biz => {
          const isActive  = biz.id === activeBusiness?.id
          const isLoading = switching === biz.id

          return (
            <button
              key={biz.id}
              type="button"
              onClick={() => void handleSelect(biz.id)}
              disabled={isLoading}
              className={[
                'group relative w-full rounded-xl border p-4 text-left transition-all',
                isActive
                  ? 'border-primary bg-primary-soft shadow-sm'
                  : 'border-border bg-surface hover:border-primary/50 hover:bg-background hover:shadow-sm',
                isLoading ? 'opacity-70' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <BusinessAvatar business={biz} size="md" />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isActive ? 'text-primary' : 'text-text'}`}>
                    {biz.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-secondary">
                    {t(`businessTypes.${biz.type}`)}
                  </p>
                </div>

                {/* State indicator */}
                <span className="shrink-0">
                  {isLoading ? (
                    <span className="flex h-5 w-5 items-center justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </span>
                  ) : isActive ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  ) : null}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Add another business */}
      {canAddMore && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleAddBusiness}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border p-4 text-left text-sm text-secondary transition-colors hover:border-primary/50 hover:bg-background hover:text-primary"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-current">
              <Plus className="h-4 w-4" />
            </span>
            <span className="font-medium">{t('selectBusiness.addBusiness')}</span>
            <span className="ml-auto text-xs text-muted">
              {t('selectBusiness.remaining', { count: 3 - businesses.length })}
            </span>
          </button>
        </div>
      )}

      {/* At limit notice */}
      {!canAddMore && (
        <p className="mt-4 text-center text-xs text-muted">
          {t('selectBusiness.atLimit')}
        </p>
      )}

      {/* Continue with current if they're just browsing */}
      {activeBusiness && (
        <div className="mt-6">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => navigate('/app', { replace: true })}
          >
            {t('selectBusiness.continue', { name: activeBusiness.name })}
          </Button>
        </div>
      )}
    </div>
  )
}
