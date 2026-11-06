import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Spinner } from '../design-system/LoadingState'
import { useAuth } from '../modules/auth/AuthContext'

/**
 * Phase 1 authenticated placeholder. No dashboard features yet — just a
 * greeting, the business name, a link to edit the profile, and log out.
 */
export function AppPlaceholder() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, profileStatus, signOut } = useAuth()

  if (profileStatus === 'loading' || !profile) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Spinner size="lg" label={t('app.home.loadingProfile')} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-12 md:py-16 text-center">
      <h1 className="heading text-2xl md:text-3xl">{t('app.home.greeting', { name: profile.owner_name })}</h1>
      <p className="mt-3 text-sm text-secondary">{t('app.home.subtitle')}</p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={() => navigate('/app/profile')}>
          {t('app.home.editProfile')}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => void signOut()}>
          {t('app.home.logout')}
        </Button>
      </div>
    </div>
  )
}
