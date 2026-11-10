/**
 * SubscriptionsPage — pricing configuration and feature flags.
 * The user subscription list has moved to the Users page.
 */
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { getSiteSettings, updateSiteSetting } from '../lib/api'
import { AdminBtn, AdminInput, Card, CardHeader } from '../components/AdminTable'

const PRICING_KEYS = [
  { key: 'plan_premium_monthly_etb', label: 'Premium — Monthly price (ETB)' },
  { key: 'plan_premium_yearly_etb',  label: 'Premium — Yearly price (ETB)'  },
]

const FLAG_KEYS = [
  { key: 'feature_flag_staff', label: 'Staff management feature' },
  { key: 'feature_flag_pos',   label: 'Point of Sale feature'    },
]

export function SubscriptionsPage() {
  const [drafts,    setDrafts]     = useState<Record<string, string>>({})
  const [saving,    setSaving]     = useState<string | null>(null)
  const [msgs,      setMsgs]       = useState<Record<string, string>>({})
  const [loading,   setLoading]    = useState(true)

  useEffect(() => {
    setLoading(true)
    getSiteSettings().then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {}
        data.forEach(s => { map[s.key] = s.value })
        setDrafts({ ...map })
      }
      setLoading(false)
    })
  }, [])

  function set(key: string, value: string) {
    setDrafts(prev => ({ ...prev, [key]: value }))
  }

  async function saveKey(key: string) {
    setSaving(key)
    const { error } = await updateSiteSetting(key, drafts[key] ?? '')
    setSaving(null)
    setMsgs(prev => ({ ...prev, [key]: error ? `Error: ${error.message}` : '✓ Saved' }))
    if (!error) setDrafts(prev => ({ ...prev, [key]: drafts[key] }))
    setTimeout(() => setMsgs(prev => { const n = { ...prev }; delete n[key]; return n }), 3000)
  }

  async function toggleFlag(key: string) {
    const current = drafts[key] === 'true'
    const next    = (!current).toString()
    set(key, next)
    setSaving(key)
    const { error } = await updateSiteSetting(key, next)
    setSaving(null)
    if (!error) setDrafts(prev => ({ ...prev, [key]: next }))
    setMsgs(prev => ({ ...prev, [key]: error ? `Error: ${error.message}` : '✓ Saved' }))
    setTimeout(() => setMsgs(prev => { const n = { ...prev }; delete n[key]; return n }), 2500)
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Loading…</div>

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Subscription Settings</h1>

      {/* Pricing */}
      <Card>
        <CardHeader title="Pricing" />
        <div className="p-5 space-y-4">
          {PRICING_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-end gap-3">
              <div className="flex-1">
                <AdminInput
                  label={label}
                  value={drafts[key] ?? ''}
                  onChange={v => set(key, v)}
                  type="number"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2 pb-0.5">
                <AdminBtn size="sm" onClick={() => void saveKey(key)} disabled={saving === key}>
                  {saving === key ? '…' : 'Save'}
                </AdminBtn>
                {msgs[key] && (
                  <span className={`text-xs whitespace-nowrap flex items-center gap-1 ${msgs[key].startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                    {!msgs[key].startsWith('Error') && <Check className="h-3 w-3" />}
                    {msgs[key]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Feature flags */}
      <Card>
        <CardHeader title="Feature Flags" />
        <div className="p-5 divide-y divide-gray-100">
          {FLAG_KEYS.map(({ key, label }) => {
            const enabled = drafts[key] === 'true'
            return (
              <div key={key} className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="flex items-center gap-3">
                  {msgs[key] && (
                    <span className={`text-xs ${msgs[key].startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                      {msgs[key]}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={saving === key}
                    onClick={() => void toggleFlag(key)}
                    className={[
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50',
                      enabled ? 'bg-primary' : 'bg-gray-200',
                    ].join(' ')}
                    style={enabled ? { backgroundColor: '#1C6B53' } : {}}
                    role="switch"
                    aria-checked={enabled}
                  >
                    <span
                      className={[
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        enabled ? 'translate-x-5' : 'translate-x-0',
                      ].join(' ')}
                    />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* App announcement */}
      <Card>
        <CardHeader title="App Announcement" />
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-400">Optional banner shown to all logged-in users. Leave blank to hide.</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <AdminInput
                value={drafts['app_announcement'] ?? ''}
                onChange={v => set('app_announcement', v)}
                placeholder="e.g. We'll be down for maintenance on Nov 15 at 2 AM"
              />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <AdminBtn size="sm" onClick={() => void saveKey('app_announcement')} disabled={saving === 'app_announcement'}>
                {saving === 'app_announcement' ? '…' : 'Save'}
              </AdminBtn>
              {msgs['app_announcement'] && (
                <span className={`text-xs ${msgs['app_announcement'].startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                  {msgs['app_announcement']}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
