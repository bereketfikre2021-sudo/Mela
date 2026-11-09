/**
 * More page — secondary navigation hub.
 *
 * Shows only sections relevant to the business type:
 * - Service businesses (service, salon): hide stock, purchases, suppliers, inventory
 * - Product businesses: show everything
 */
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart2,
  ClipboardList,
  History,
  Package,
  Settings,
  Truck,
} from 'lucide-react'

import { useAuth } from '../modules/auth/AuthContext'
import { getBusinessConfig } from '../modules/auth/businessConfig'

interface TileProps {
  icon: React.ReactNode
  label: string
  desc: string
  onClick: () => void
}

function Tile({ icon, label, desc, onClick }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-shadow hover:shadow-layer active:bg-background"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text">{label}</p>
        <p className="mt-0.5 text-xs text-secondary leading-snug">{desc}</p>
      </div>
    </button>
  )
}

export function MorePage() {
  const { t }       = useTranslation()
  const navigate    = useNavigate()
  const { profile } = useAuth()
  const bizConfig   = getBusinessConfig(profile?.type ?? 'retail')
  const isService   = bizConfig.isServiceBased

  const tiles = [
    // Reports — always visible
    {
      icon:  <BarChart2 className="h-5 w-5" aria-hidden="true" />,
      label: t('nav.reports'),
      desc:  t('more.desc.reports'),
      route: '/app/reports',
      show:  true,
    },
    // Settings — always visible
    {
      icon:  <Settings className="h-5 w-5" aria-hidden="true" />,
      label: t('more.settings'),
      desc:  t('more.desc.settings'),
      route: '/app/profile',
      show:  true,
    },
    // Product businesses only below
    {
      icon:  <ClipboardList className="h-5 w-5" aria-hidden="true" />,
      label: t('nav.purchases'),
      desc:  t('more.desc.purchases'),
      route: '/app/purchases',
      show:  !isService,
    },
    {
      icon:  <Truck className="h-5 w-5" aria-hidden="true" />,
      label: t('nav.suppliers'),
      desc:  t('more.desc.suppliers'),
      route: '/app/suppliers',
      show:  !isService,
    },
    {
      icon:  <History className="h-5 w-5" aria-hidden="true" />,
      label: t('nav.inventory'),
      desc:  t('more.desc.inventory'),
      route: '/app/inventory',
      show:  !isService,
    },
    {
      icon:  <Package className="h-5 w-5" aria-hidden="true" />,
      label: t('nav.products'),
      desc:  t('more.desc.products'),
      route: '/app/products',
      show:  !isService,
    },
  ].filter(t => t.show)

  return (
    <div className="py-6 md:py-10">
      <h1 className="heading mb-6 text-2xl md:text-3xl">{t('more.title')}</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tiles.map(tile => (
          <Tile
            key={tile.route}
            icon={tile.icon}
            label={tile.label}
            desc={tile.desc}
            onClick={() => navigate(tile.route)}
          />
        ))}
      </div>
    </div>
  )
}
