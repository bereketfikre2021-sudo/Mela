/**
 * BusinessAvatar
 *
 * Shows the business avatar image if set, otherwise falls back to
 * the business type icon on a coloured background — same as the
 * business picker tiles.
 */
import { getBusinessConfig } from '../modules/auth/businessConfig'
import type { Business } from '../modules/auth/types'

interface BusinessAvatarProps {
  business: Pick<Business, 'name' | 'type' | 'avatar_url'>
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_MAP = {
  sm: { outer: 'h-8 w-8',   icon: 'h-4 w-4',   text: 'text-xs' },
  md: { outer: 'h-10 w-10', icon: 'h-5 w-5',   text: 'text-sm' },
  lg: { outer: 'h-14 w-14', icon: 'h-7 w-7',   text: 'text-base' },
  xl: { outer: 'h-20 w-20', icon: 'h-9 w-9',   text: 'text-lg' },
}

export function BusinessAvatar({ business, size = 'md', className = '' }: BusinessAvatarProps) {
  const config = getBusinessConfig(business.type)
  const s      = SIZE_MAP[size]
  const Icon   = config.icon

  if (business.avatar_url) {
    return (
      <img
        src={business.avatar_url}
        alt={business.name}
        className={`${s.outer} rounded-xl object-cover ${className}`}
      />
    )
  }

  return (
    <span className={`${s.outer} flex shrink-0 items-center justify-center rounded-xl bg-primary text-white ${className}`}>
      <Icon className={s.icon} aria-hidden="true" />
    </span>
  )
}
