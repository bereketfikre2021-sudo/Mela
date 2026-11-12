import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, X } from 'lucide-react'
import { getPaymentSubmission, approvePayment, rejectPayment, getBusiness } from '../lib/api'
import { AdminBtn, Badge } from '../components/AdminTable'
import type { AdminBusiness, AdminPaymentSubmission } from '../lib/types'

function fmtDate(s: string | null) {
  if (!s) return '--'
  return new Date(s).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function PaymentDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const [payment, setPayment]       = useState<AdminPaymentSubmission | null>(null)
  const [business, setBusiness]     = useState<AdminBusiness | null>(null)
  const [notes, setNotes]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [acting, setActing]         = useState(false)
  const [msg, setMsg]               = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getPaymentSubmission(id).then(async ({ data }) => {
      if (data) {
        setPayment(data)
        const { data: biz } = await getBusiness(data.owner_id).catch(() => ({ data: null }))
        if (biz) setBusiness(biz)
      }
      setLoading(false)
    })
  }, [id])

  async function handleApprove() {
    if (!payment) return
    if (!confirm('Approve this payment and activate Premium subscription?')) return
    setActing(true)
    const { error } = await approvePayment(payment)
    setActing(false)
    if (error) { setMsg(`Error: ${error.message}`); return }
    setMsg('Payment approved. Subscription activated.')
    setPayment(prev => prev ? { ...prev, status: 'approved' } : prev)
  }

  async function handleReject() {
    if (!payment) return
    if (!notes.trim()) { setMsg('Please add rejection notes before rejecting.'); return }
    if (!confirm('Reject this payment submission?')) return
    setActing(true)
    const { error } = await rejectPayment(payment.id, notes)
    setActing(false)
    if (error) { setMsg(`Error: ${error.message}`); return }
    setMsg('Payment rejected.')
    setPayment(prev => prev ? { ...prev, status: 'rejected', reviewer_notes: notes } : prev)
  }

  if (loading)  return <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
  if (!payment) return <div className="py-8 text-center text-sm text-red-500">Payment not found.</div>

  const isPending = payment.status === 'pending'

  return (
    <div className="max-w-2xl space-y-6">
      <button type="button" onClick={() => navigate('/admin/payments')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to Payments
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payment Review</h1>
        <Badge color={payment.status === 'approved' ? 'green' : payment.status === 'rejected' ? 'red' : 'yellow'}>
          {payment.status}
        </Badge>
      </div>

      {/* Business info */}
      {business && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Business</h2>
          <p className="font-semibold text-gray-900">{business.name}</p>
          <p className="text-sm text-gray-500">{business.owner_name} &middot; {business.phone}</p>
          <p className="mt-1 font-mono text-xs text-gray-400">{payment.owner_id}</p>
        </section>
      )}

      {/* Payment details */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Payment Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Amount', `ETB ${payment.amount_etb}`],
            ['Method', payment.payment_method.replace(/_/g, ' ')],
            ['Plan', payment.plan],
            ['Billing cycle', payment.billing_cycle],
            ['Submitted', fmtDate(payment.submitted_at)],
            ['Reviewed', fmtDate(payment.reviewed_at)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-gray-400">{k}</p>
              <p className="font-medium text-gray-900">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-xs text-gray-400">Transaction reference</p>
          <p className="font-mono text-xs text-gray-700 break-all mt-1">{payment.transaction_reference}</p>
        </div>
      </section>

      {/* Screenshot */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Payment Screenshot</h2>
        {payment.screenshot_url ? (
          <div className="space-y-3">
            <a href={payment.screenshot_url} target="_blank" rel="noopener noreferrer">
              <img
                src={payment.screenshot_url}
                alt="Payment screenshot"
                className="w-full max-h-96 rounded-lg border border-gray-200 object-contain bg-gray-50 cursor-zoom-in hover:opacity-90 transition-opacity"
              />
            </a>
            <a
              href={payment.screenshot_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline"
            >
              Open full size &#8599;
            </a>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No screenshot uploaded for this submission.</p>
        )}
      </section>

      {/* Actions */}
      {isPending && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Review</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes (required for rejection)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes for the user..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-3">
            <AdminBtn onClick={() => void handleApprove()} disabled={acting}>
              <Check className="mr-1.5 h-4 w-4" />
              Approve & Activate
            </AdminBtn>
            <AdminBtn variant="danger" onClick={() => void handleReject()} disabled={acting}>
              <X className="mr-1.5 h-4 w-4" />
              Reject
            </AdminBtn>
          </div>
          {msg && <p className={`text-sm ${msg.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>{msg}</p>}
        </section>
      )}

      {payment.reviewer_notes && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Reviewer Notes</h2>
          <p className="text-sm text-gray-700">{payment.reviewer_notes}</p>
        </section>
      )}
    </div>
  )
}
