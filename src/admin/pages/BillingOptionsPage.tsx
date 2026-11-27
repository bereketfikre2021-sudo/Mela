/**
 * BillingOptionsPage — admin CRUD for subscription billing options.
 */
import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import {
  getBillingOptions,
  createBillingOption,
  updateBillingOption,
  deleteBillingOption,
} from '../lib/api'
import type { BillingOption, BillingOptionInput } from '../lib/types'

function fmtETB(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
}

function monthlyRate(price: number, months: number) {
  return (price / months).toFixed(0)
}

function savingsPct(price: number, months: number, baseMonthlyPrice: number) {
  const full = baseMonthlyPrice * months
  if (full <= price) return 0
  return Math.round(((full - price) / full) * 100)
}

const EMPTY: BillingOptionInput = {
  name: '', duration_months: 1, price_etb: 0,
  is_active: true, is_featured: false, display_order: 0, badge_text: null,
}

export function BillingOptionsPage() {
  const [options,     setOptions]     = useState<BillingOption[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [editTarget,  setEditTarget]  = useState<BillingOption | null>(null)
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState<BillingOptionInput>(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState('')
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await getBillingOptions()
    setLoading(false)
    if (error) { setError(error.message); return }
    setOptions(data ?? [])
  }

  useEffect(() => { void load() }, [])

  function openCreate() {
    setEditTarget(null)
    setForm({ ...EMPTY, display_order: (options.length + 1) * 10 })
    setSaveError('')
    setShowForm(true)
  }

  function openEdit(opt: BillingOption) {
    setEditTarget(opt)
    setForm({
      name:            opt.name,
      duration_months: opt.duration_months,
      price_etb:       opt.price_etb,
      is_active:       opt.is_active,
      is_featured:     opt.is_featured,
      display_order:   opt.display_order,
      badge_text:      opt.badge_text,
    })
    setSaveError('')
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditTarget(null) }

  async function handleSave() {
    if (!form.name.trim()) { setSaveError('Name is required.'); return }
    if (form.price_etb <= 0) { setSaveError('Price must be greater than 0.'); return }
    if (form.duration_months < 1) { setSaveError('Duration must be at least 1 month.'); return }

    setSaving(true); setSaveError('')
    const { error } = editTarget
      ? await updateBillingOption(editTarget.id, form)
      : await createBillingOption(form)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    closeForm()
    void load()
  }

  async function handleToggle(opt: BillingOption) {
    await updateBillingOption(opt.id, { is_active: !opt.is_active })
    void load()
  }

  async function handleFeature(opt: BillingOption) {
    // Unfeature all, then feature this one
    await Promise.all(
      options.map(o => updateBillingOption(o.id, { is_featured: o.id === opt.id ? !opt.is_featured : false }))
    )
    void load()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true); setDeleteError('')
    const { error } = await deleteBillingOption(deleteId)
    setDeleting(false)
    if (error) { setDeleteError(error.message); return }
    setDeleteId(null)
    void load()
  }

  const baseMonthly = options.find(o => o.duration_months === 1)?.price_etb ?? options[0]?.price_etb ?? 399

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Subscription Plans & Pricing</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage billing options shown to customers. Changes apply immediately to new purchases.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#123D35' }}
        >
          <Plus className="h-4 w-4" />
          Add option
        </button>
      </div>

      {/* Error */}
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Order','Name','Duration','Price (ETB)','Eff. Monthly','Savings','Status','Featured',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {options.map(opt => {
                const savings = savingsPct(opt.price_etb, opt.duration_months, baseMonthly)
                return (
                  <tr key={opt.id} className={!opt.is_active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 text-gray-500">{opt.display_order}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{opt.name}</p>
                      {opt.badge_text && (
                        <span className="mt-0.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {opt.badge_text}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{opt.duration_months} month{opt.duration_months > 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmtETB(opt.price_etb)}</td>
                    <td className="px-4 py-3 text-gray-600">ETB {monthlyRate(opt.price_etb, opt.duration_months)}/mo</td>
                    <td className="px-4 py-3">
                      {savings > 0 ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{savings}% off</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void handleToggle(opt)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                          opt.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {opt.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void handleFeature(opt)}
                        title={opt.is_featured ? 'Remove featured' : 'Set as featured'}
                        className={`rounded-full p-1 transition-colors ${opt.is_featured ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                      >
                        <Star className="h-4 w-4" fill={opt.is_featured ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(opt)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => { setDeleteId(opt.id); setDeleteError('') }}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {options.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                    No billing options yet. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {editTarget ? 'Edit billing option' : 'Add billing option'}
              </h2>
              <button type="button" onClick={closeForm} className="rounded-lg p-1 text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Name" required>
                <input className={INPUT} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Quarterly" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Duration (months)" required>
                  <input className={INPUT} type="number" min={1} value={form.duration_months}
                    onChange={e => setForm(f => ({ ...f, duration_months: parseInt(e.target.value) || 1 }))} />
                </Field>
                <Field label="Price (ETB)" required>
                  <input className={INPUT} type="number" min={1} step="0.01" value={form.price_etb}
                    onChange={e => setForm(f => ({ ...f, price_etb: parseFloat(e.target.value) || 0 }))} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Display order">
                  <input className={INPUT} type="number" value={form.display_order}
                    onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
                </Field>
                <Field label="Badge text">
                  <input className={INPUT} value={form.badge_text ?? ''}
                    onChange={e => setForm(f => ({ ...f, badge_text: e.target.value || null }))}
                    placeholder="e.g. Best value" />
                </Field>
              </div>

              {/* Preview */}
              {form.price_etb > 0 && form.duration_months > 0 && (
                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <span className="font-medium">Preview: </span>
                  ETB {monthlyRate(form.price_etb, form.duration_months)}/month effective
                  {savingsPct(form.price_etb, form.duration_months, baseMonthly) > 0 &&
                    ` · saves ${savingsPct(form.price_etb, form.duration_months, baseMonthly)}% vs monthly`}
                </div>
              )}

              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Active
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.is_featured}
                    onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
                  Featured
                </label>
              </div>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={closeForm} disabled={saving}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#123D35' }}>
                {saving ? 'Saving…' : <><Check className="h-4 w-4" />{editTarget ? 'Save changes' : 'Add option'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-bold text-gray-900">Delete billing option?</h2>
            <p className="mb-1 text-sm text-gray-600">
              This cannot be undone. Options with active subscriptions cannot be deleted.
            </p>
            {deleteError && <p className="mb-3 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setDeleteId(null)} disabled={deleting}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={() => void handleDelete()} disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
