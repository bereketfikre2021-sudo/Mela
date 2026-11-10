import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAllPaymentSubmissions } from '../lib/api'
import { AdminTable, AThead, ATh, ATbody, ATr, ATd, Badge, AdminBtn } from '../components/AdminTable'
import type { AdminPaymentSubmission } from '../lib/types'

// ── Re-export PaymentMethodsPage inline as a tab ───────────────────────────
import { PaymentMethodsPage } from './PaymentMethodsPage'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'] as const
type Filter = typeof STATUS_FILTERS[number]

type Tab = 'submissions' | 'methods'

export function PaymentsPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initStatus = (params.get('status') as Filter) ?? 'pending'
  const initTab: Tab = params.get('tab') === 'methods' ? 'methods' : 'submissions'

  const [tab,     setTab]     = useState<Tab>(initTab)
  const [filter,  setFilter]  = useState<Filter>(initStatus)
  const [payments,setPayments]= useState<AdminPaymentSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tab !== 'submissions') return
    setLoading(true)
    getAllPaymentSubmissions(filter === 'all' ? undefined : filter).then(({ data }) => {
      if (data) setPayments(data)
      setLoading(false)
    })
  }, [filter, tab])

  function statusBadge(s: string) {
    if (s === 'pending')  return <Badge color="yellow">Pending</Badge>
    if (s === 'approved') return <Badge color="green">Approved</Badge>
    return <Badge color="red">Rejected</Badge>
  }

  return (
    <div className="space-y-5">
      {/* Page header + top-level tabs */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <div className="mt-4 flex gap-1 border-b border-gray-200">
          {([
            { id: 'submissions', label: 'Submissions' },
            { id: 'methods',     label: 'Payment Methods' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-900',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Submissions tab ───────────────────────────────────────────── */}
      {tab === 'submissions' && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
              {STATUS_FILTERS.map(f => (
                <button key={f} type="button" onClick={() => setFilter(f)}
                  className={[
                    'rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                    filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900',
                  ].join(' ')}>
                  {f}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-400">{payments.length} records</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <AdminTable>
                <AThead>
                  <ATh>Owner ID</ATh>
                  <ATh>Amount</ATh>
                  <ATh>Method</ATh>
                  <ATh>Cycle</ATh>
                  <ATh>Status</ATh>
                  <ATh>Submitted</ATh>
                  <ATh>Action</ATh>
                </AThead>
                <ATbody>
                  {payments.map(p => (
                    <ATr key={p.id} onClick={() => navigate(`/admin/payments/${p.id}`)}>
                      <ATd><span className="font-mono text-xs">{p.owner_id.slice(0, 10)}…</span></ATd>
                      <ATd><span className="font-semibold">ETB {p.amount_etb}</span></ATd>
                      <ATd>{p.payment_method.replace('_', ' ')}</ATd>
                      <ATd muted>{p.billing_cycle}</ATd>
                      <ATd>{statusBadge(p.status)}</ATd>
                      <ATd muted>{fmtDate(p.submitted_at)}</ATd>
                      <ATd>
                        <div onClick={e => e.stopPropagation()}>
                          <AdminBtn size="sm" variant="secondary" onClick={() => navigate(`/admin/payments/${p.id}`)}>
                            Review
                          </AdminBtn>
                        </div>
                      </ATd>
                    </ATr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-400">No payments found.</td></tr>
                  )}
                </ATbody>
              </AdminTable>
            </div>
          )}
        </div>
      )}

      {/* ── Payment Methods tab ───────────────────────────────────────── */}
      {tab === 'methods' && <PaymentMethodsPage />}
    </div>
  )
}
