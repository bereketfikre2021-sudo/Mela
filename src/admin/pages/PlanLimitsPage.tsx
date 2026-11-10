import { useEffect, useState } from 'react'
import { getPlanLimits, updatePlanLimits } from '../lib/api'
import { AdminBtn, AdminInput } from '../components/AdminTable'
import type { AdminPlanLimits } from '../lib/types'

type EditableField = Exclude<keyof AdminPlanLimits, 'plan' | 'updated_at' | 'advanced_reports'>

const FIELDS: { key: EditableField; label: string }[] = [
  { key: 'max_products',           label: 'Max products' },
  { key: 'max_sales_per_month',    label: 'Max sales / month' },
  { key: 'max_customers',          label: 'Max customers' },
  { key: 'max_suppliers',          label: 'Max suppliers' },
  { key: 'max_purchases_per_month',label: 'Max purchases / month' },
  { key: 'max_staff',              label: 'Max staff members' },
  { key: 'inventory_history_days', label: 'Inventory history (days)' },
]

export function PlanLimitsPage() {
  const [plans, setPlans] = useState<AdminPlanLimits[]>([])
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPlanLimits().then(({ data }) => {
      if (data) {
        setPlans(data)
        const init: Record<string, Record<string, string>> = {}
        data.forEach(p => {
          init[p.plan] = {}
          FIELDS.forEach(f => { init[p.plan][f.key] = String(p[f.key]) })
        })
        setDrafts(init)
      }
      setLoading(false)
    })
  }, [])

  function setField(plan: string, key: string, val: string) {
    setDrafts(prev => ({ ...prev, [plan]: { ...prev[plan], [key]: val } }))
  }

  async function save(plan: string) {
    setSaving(plan)
    const patch: Partial<AdminPlanLimits> = {}
    FIELDS.forEach(f => { (patch as Record<string, number>)[f.key] = Number(drafts[plan]?.[f.key] ?? 0) })
    const { error } = await updatePlanLimits(plan, patch)
    setSaving(null)
    setMsg(prev => ({ ...prev, [plan]: error ? `Error: ${error.message}` : 'âœ“ Saved' }))
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Loadingâ€¦</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Plan Limits</h1>
      <p className="text-sm text-gray-500">Configure the resource limits for Free and Premium plans. Changes take effect immediately for new checks.</p>

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map(p => (
          <div key={p.plan} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold capitalize text-gray-900">{p.plan} Plan</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Advanced reports</label>
                <input type="checkbox" checked={p.advanced_reports} readOnly
                  className="rounded accent-emerald-600" />
              </div>
            </div>

            {FIELDS.map(f => (
              <AdminInput
                key={f.key}
                label={f.label}
                value={drafts[p.plan]?.[f.key] ?? ''}
                onChange={v => setField(p.plan, f.key, v)}
                type="number"
              />
            ))}

            <div className="flex items-center gap-3 pt-2">
              <AdminBtn onClick={() => void save(p.plan)} disabled={saving === p.plan}>
                {saving === p.plan ? 'Savingâ€¦' : 'Save changes'}
              </AdminBtn>
              {msg[p.plan] && (
                <span className={`text-xs ${msg[p.plan].startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                  {msg[p.plan]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


