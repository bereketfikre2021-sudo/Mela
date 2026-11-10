/**
 * NotificationBell — shows unread count badge in the top bar.
 * Navigates to /app/notifications on click.
 */
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppNotifications } from '../modules/notifications/NotificationContext'

export function NotificationBell() {
  const { t }          = useTranslation()
  const navigate       = useNavigate()
  const { unreadCount } = useAppNotifications()

  return (
    <button
      type="button"
      onClick={() => navigate('/app/notifications')}
      aria-label={t('notifications.bell', { count: unreadCount })}
      className="relative rounded-lg p-2 text-secondary hover:bg-background hover:text-text transition-colors"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
