/**
 * AdminLayout — sidebar + content shell with wired Bell and Avatar.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Activity, Bell, Building2, ChevronDown, CreditCard,
  LayoutDashboard, LogOut, Menu, Search, Users, X,
} from 'lucide-react'
import { useAdminAuth } from '../lib/AdminAuthContext'
import { getAllPaymentSubmissions } from '../lib/api'

const NAV = [
  { href: '/admin/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/users',         label: 'Users',         icon: Users },
  { href: '/admin/payments',      label: 'Payments',      icon: CreditCard },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: Building2 },
  { href: '/admin/staff',         label: 'Staff',         icon: Users },
  { href: '/admin/activity',      label: 'Activity',      icon: Activity },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut }     = useAdminAuth()
  const navigate              = useNavigate()
  const location              = useLocation()
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [avatarOpen, setAvatarOpen]     = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  const initials  = (user?.email ?? 'A').slice(0, 2).toUpperCase()
  const pageLabel = location.pathname.replace('/admin/', '').replace(/-/g, ' ') || 'dashboard'
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // Load pending payment count for bell badge
  useEffect(() => {
    getAllPaymentSubmissions('pending').then(({ data }) => {
      if (data) setPendingCount(data.length)
    })
  }, [location.pathname]) // refresh on nav

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarOpen) return
    function handler(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarOpen])

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bellOpen])

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Outfit', system-ui, sans-serif", backgroundColor: '#F7F7F2' }}>

      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-56 flex-col lg:static lg:translate-x-0 transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ backgroundColor: '#123D35' }}
      >
        <div className="flex h-16 items-center gap-3 px-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <img src="/Logo.svg" alt="MELA" className="h-8 w-8 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold leading-tight text-white">MELA</p>
            <p className="text-[10px] font-medium" style={{ color: '#D9F0E4', opacity: 0.8 }}>Admin OPS</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="ml-auto text-white/40 hover:text-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-0.5">
          {NAV.map(item => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
            return (
              <button key={item.href} type="button"
                onClick={() => { navigate(item.href); setOpen(false) }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all"
                style={active ? { backgroundColor: '#1C6B53', color: '#fff' } : { color: 'rgba(255,255,255,0.65)' }}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {item.label}
                {/* Pending badge on Payments */}
                {item.href === '/admin/payments' && pendingCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-bold text-gray-900">
                    {pendingCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: '#D9F0E4', color: '#123D35' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-white">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Administrator</p>
            </div>
            <button type="button" onClick={() => void signOut()} title="Sign out"
              className="flex-shrink-0 text-white/40 hover:text-white transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b bg-white px-6 shadow-sm">
          <button type="button" onClick={() => setOpen(true)} className="text-gray-400 hover:text-gray-700 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="text" placeholder="Search anything…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none border border-gray-200 focus:border-gray-300" />
          </div>

          <div className="ml-auto flex items-center gap-2">

            {/* Bell — dropdown with pending payment summary */}
            <div ref={bellRef} className="relative">
              <button type="button"
                onClick={() => setBellOpen(v => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                title={pendingCount > 0 ? `${pendingCount} pending payment${pendingCount !== 1 ? 's' : ''}` : 'Notifications'}>
                <Bell className="h-4 w-4 text-gray-500" aria-hidden="true" />
                {pendingCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  </div>
                  {pendingCount > 0 ? (
                    <div className="py-1">
                      <button type="button"
                        onClick={() => { setBellOpen(false); navigate('/admin/payments?status=pending') }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                          <CreditCard className="h-4 w-4 text-yellow-600" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {pendingCount} pending payment{pendingCount !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-gray-500">Awaiting review and approval</p>
                        </div>
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-bold text-gray-900">
                          {pendingCount}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-gray-400">No new notifications</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Page label */}
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
              <span className="text-xs font-medium capitalize text-gray-600">{pageLabel}</span>
            </div>

            {/* Avatar with dropdown */}
            <div ref={avatarRef} className="relative">
              <button type="button"
                onClick={() => setAvatarOpen(v => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#D9F0E4', color: '#123D35' }}>
                  {initials}
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${avatarOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-gray-900">{user?.email?.split('@')[0]}</p>
                    <p className="truncate text-xs text-gray-400">{user?.email}</p>
                    <p className="mt-0.5 text-xs font-medium" style={{ color: '#1C6B53' }}>Administrator</p>
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button type="button" onClick={() => { setAvatarOpen(false); void signOut() }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
