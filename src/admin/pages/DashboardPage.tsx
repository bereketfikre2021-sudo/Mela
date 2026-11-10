import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, getAllPaymentSubmissions, getActivityLog } from '../lib/api'
import { Card, CardHeader, StatCard, AdminTable, AThead, ATh, ATbody, ATr, ATd, Badge, AdminBtn, ViewAllLink } from '../components/AdminTable'
import type { AdminPaymentSubmission } from '../lib/types'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtTimeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(s).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })
}

type LogEntry = { id: string; action_type: string; details: Record<string,unknown> | null; created_at: string }

export function DashboardPage() {
  const navigate = useNavigate()
  const [stats,   setStats]   = useState({ totalBusinesses: 0, premiumSubscriptions: 0, pendingPayments: 0 })
  const [pending, setPending] = useState<AdminPaymentSubmission[]>([])
  const [activity,setActivity]= useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDashboardStats(),
      getAllPaymentSubmissions('pending'),
      getActivityLog(undefined, 8),
    ]).then(([s, p, a]) => {
      if (s.data) setStats(s.data)
      if (p.data) setPending(p.data.slice(0, 6))
      if (a.data) setActivity((a.data as LogEntry[]).slice(0, 6))
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Hero greeting card ─────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#1C6B53' }}>
              {greeting}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 leading-snug">
              Here's how MELA stands today.
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {stats.totalBusinesses} businesses registered ·{' '}
              {stats.premiumSubscriptions} premium subscribers ·{' '}
              {stats.pendingPayments > 0 ? `${stats.pendingPayments} payments awaiting review` : 'All payments reviewed'}
            </p>
            <div className="mt-5 flex gap-3">
              <AdminBtn onClick={() => navigate('/admin/payments?status=pending')}>
                Review Payments
              </AdminBtn>
              <AdminBtn variant="secondary" onClick={() => navigate('/admin/users')}>
                View Users
              </AdminBtn>
            </div>
          </div>
          {/* Illustration placeholder — MELA logo large */}
          <div className="hidden md:flex items-center justify-center rounded-2xl p-6" style={{ backgroundColor: '#D9F0E4' }}>
            <img src="/Logo.svg" alt="" className="h-20 w-20 opacity-80" aria-hidden="true" />
          </div>
        </div>
      </Card>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Businesses" value={stats.totalBusinesses} color="green" sub="Registered owners" />
        <StatCard label="Premium Subscribers" value={stats.premiumSubscriptions} color="blue" sub="Active premium plans" />
        <StatCard label="Pending Payments" value={stats.pendingPayments} color="yellow" sub="Awaiting review" />
      </div>

      {/* ── Two-column section ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Pending payments table — 2/3 width */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Pending Payments"
              action={pending.length > 0 ? <ViewAllLink onClick={() => navigate('/admin/payments?status=pending')} /> : undefined}
            />
            {pending.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                No pending payments — all caught up!
              </div>
            ) : (
              <div className="px-1 pb-2">
                <AdminTable>
                  <AThead>
                    <ATh>Owner ID</ATh>
                    <ATh>Amount</ATh>
                    <ATh>Method</ATh>
                    <ATh>Submitted</ATh>
                    <ATh>Status</ATh>
                  </AThead>
                  <ATbody>
                    {pending.map(p => (
                      <ATr key={p.id} onClick={() => navigate(`/admin/payments/${p.id}`)}>
                        <ATd><span className="font-mono text-xs">{p.owner_id.slice(0, 10)}…</span></ATd>
                        <ATd><span className="font-semibold">ETB {p.amount_etb}</span></ATd>
                        <ATd muted>{p.payment_method.replace('_', ' ')}</ATd>
                        <ATd muted>{fmtDate(p.submitted_at)}</ATd>
                        <ATd><Badge color="yellow">Pending</Badge></ATd>
                      </ATr>
                    ))}
                  </ATbody>
                </AdminTable>
              </div>
            )}
          </Card>
        </div>

        {/* Activity timeline — 1/3 width */}
        <div>
          <Card>
            <CardHeader title="Activity Timeline" />
            <div className="px-5 py-3">
              {activity.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No recent activity.</p>
              ) : (
                <ul className="space-y-0">
                  {activity.map((entry, i) => (
                    <li key={entry.id} className="flex gap-3">
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#1C6B53' }} />
                        {i < activity.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ backgroundColor: '#D9F0E4', minHeight: 24 }} />
                        )}
                      </div>
                      <div className="pb-4 min-w-0">
                        <p className="text-sm font-medium text-gray-800 leading-snug">
                          {entry.action_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </p>
                        {entry.details && (
                          <p className="mt-0.5 text-xs text-gray-400 truncate">
                            {Object.values(entry.details).filter(Boolean).slice(0, 2).join(' · ')}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] text-gray-300">{fmtTimeAgo(entry.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
