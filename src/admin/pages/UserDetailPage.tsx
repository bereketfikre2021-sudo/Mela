import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  getBusiness, getSubscriptionForOwner, getAllPaymentSubmissions,
  overrideSubscription, getAllStaff, getActivityLog,
} from '../lib/api'
import { AdminBtn, AdminSelect, Badge } from '../components/AdminTable'
import type { AdminBusiness, AdminSubscription, AdminPaymentSubmission, AdminStaffMember } from '../lib/types'

function fmtDate(s: string | null) {
  if (!s) return 'â€”'
  return new Date(s).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
}

function SubBadge({ status, plan }: { status: string; plan: string }) {
  if (plan === 'premium' && status === 'active') return <Badge color="green">Premium Â· Active</Badge>
  if (plan === 'premium' && status === 'grace')  return <Badge color="yellow">Premium Â· Grace</Badge>
  if (status === 'expired') return <Badge color="red">Expired</Badge>
  if (status === 'cancelled') return <Badge color="gray">Cancelled</Badge>
  return <Badge color="gray">Free</Badge>
}

export function UserDetailPage() {
  const { ownerId } = useParams<{ ownerId: string }>()
  const navigate    = useNavigate()

  const [biz,       setBiz]       = useState<AdminBusiness | null>(null)
  const [sub,       setSub]       = useState<AdminSubscription | null>(null)
  const [payments,  setPayments]  = useState<AdminPaymentSubmission[]>([])
  const [staff,     setStaff]     = useState<AdminStaffMember[]>([])
  const [activity,  setActivity]  = useState<unknown[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')

  // Override controls
  const [newPlan,   setNewPlan]   = useState('')
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    if (!ownerId) return
    setLoading(true)
    Promise.all([
      getBusiness(ownerId).catch(() => ({ data: null })),
      getSubscriptionForOwner(ownerId),
      getAllPaymentSubmissions().then(r => ({ data: r.data?.filter(p => p.owner_id === ownerId) ?? [] })),
      getAllStaff(ownerId),
      getActivityLog(ownerId, 20),
    ]).then(([b, s, p, st, a]) => {
      if (b.data) { setBiz(b.data); }
      if (s.data) { setSub(s.data); setNewPlan(s.data.plan); setNewStatus(s.data.status) }
      if (p.data) setPayments(p.data)
      if (st.data) setStaff(st.data)
      if (a.data) setActivity(a.data)
      setLoading(false)
    })
  }, [ownerId])

  async function handleOverride() {
    if (!sub) return
    setSaving(true)
    const { error } = await overrideSubscription(sub.id, {
      plan: newPlan as 'free' | 'premium',
      status: newStatus as AdminSubscription['status'],
    })
    setSaving(false)
    setMsg(error ? `Error: ${error.message}` : 'Subscription updated.')
    if (!error) setSub(prev => prev ? { ...prev, plan: newPlan as 'free' | 'premium', status: newStatus } : prev)
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Loadingâ€¦</div>
  if (!biz)    return <div className="py-8 text-center text-sm text-red-500">Business not found.</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <button type="button" onClick={() => navigate('/admin/users')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </button>

      <h1 className="text-2xl font-bold text-gray-900">{biz.name}</h1>

      {/* Business info */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Business Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Owner', biz.owner_name], ['Phone', biz.phone],
            ['Type', biz.type], ['Language', biz.language.toUpperCase()],
            ['Closing time', biz.closing_time ?? 'â€”'], ['Joined', fmtDate(biz.created_at)],
            ['Owner ID', biz.owner_id],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-gray-400">{k}</p>
              <p className="font-medium text-gray-900 break-all">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subscription */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Subscription</h2>
        {sub ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <SubBadge status={sub.status} plan={sub.plan} />
              <span className="text-sm text-gray-500">Expires: {fmtDate(sub.current_period_end)}</span>
            </div>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-gray-100">
              <AdminSelect label="Plan" value={newPlan} onChange={setNewPlan}
                options={[{ value: 'free', label: 'Free' }, { value: 'premium', label: 'Premium' }]} />
              <AdminSelect label="Status" value={newStatus} onChange={setNewStatus}
                options={['active','grace','expired','cancelled','pending_payment'].map(s => ({ value: s, label: s }))} />
              <AdminBtn onClick={() => void handleOverride()} disabled={saving}>
                {saving ? 'Savingâ€¦' : 'Override'}
              </AdminBtn>
            </div>
            {msg && <p className={`text-xs ${msg.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>{msg}</p>}
          </div>
        ) : <p className="text-sm text-gray-400">No subscription row.</p>}
      </section>

      {/* Payment history */}
      {payments.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Payment Submissions</h2>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 text-sm">
                <span>{fmtDate(p.submitted_at)} Â· {p.payment_method} Â· ETB {p.amount_etb}</span>
                <Badge color={p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'red' : 'yellow'}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Staff */}
      {staff.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Staff Members</h2>
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 text-sm">
                <span className="font-medium">{s.name}</span>
                <div className="flex items-center gap-2">
                  <Badge color="gray">{s.role}</Badge>
                  <Badge color={s.status === 'active' ? 'green' : 'red'}>{s.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      {(activity as Array<{ id: string; action_type: string; created_at: string }>).length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Recent Activity</h2>
          <div className="space-y-1">
            {(activity as Array<{ id: string; action_type: string; created_at: string }>).map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{a.action_type.replace(/_/g, ' ')}</span>
                <span className="text-xs text-gray-400">{fmtDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}



