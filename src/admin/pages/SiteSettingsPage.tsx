import { useEffect, useState } from 'react'
import { getSiteSettings, updateSiteSetting } from '../lib/api'
import { AdminBtn, AdminInput } from '../components/AdminTable'
import type { SiteSetting } from '../lib/types'

const GROUPS: { label: string; keys: string[] }[] = [
  {
    label: 'Pricing (ETB)',
    keys: ['plan_premium_monthly_etb', 'plan_premium_yearly_etb'],
  },
  {
    label: 'Feature Flags',
    keys: ['feature_flag_staff', 'feature_flag_pos'],
  },
  {
    label: 'App Announcement',
    keys: ['app_announcement'],
  },
]

function friendlyLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function SiteSettingsPage() {
  const [settings, setSettings]   = useState<Record<string, string>>({})
  const [drafts,   setDrafts]     = useState<Record<string, string>>({})
  const [saving,   setSaving]     = useState<string | null>(null)
  const [msgs,     setMsgs]       = useState<Record<string, string>>({})
  const [loading,  setLoading]    = useState(true)

  useEffect(() => {
    setLoading(true)
    getSiteSettings().then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((s: SiteSetting) => { map[s.key] = s.value })
        setSettings(map)
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
    setMsgs(prev => ({ ...prev, [key]: error ? `Error: ${error.message}` : 'âœ“ Saved' }))
    if (!error) setSettings(prev => ({ ...prev, [key]: drafts[key] }))
    setTimeout(() => setMsgs(prev => { const n = { ...prev }; delete n[key]; return n }), 3000)
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Loadingâ€¦</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure payment accounts, pricing and feature flags. Changes are live immediately.</p>
      </div>

      {GROUPS.map(group => (
        <div key={group.label} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">{group.label}</h2>
          {group.keys.map(key => (
            <div key={key} className="flex items-end gap-2">
              <div className="flex-1">
                <AdminInput
                  label={friendlyLabel(key)}
                  value={drafts[key] ?? ''}
                  onChange={v => set(key, v)}
                  placeholder={settings[key] || 'Not set'}
                />
              </div>
              <div className="flex items-center gap-2 pb-0.5">
                <AdminBtn size="sm" onClick={() => void saveKey(key)} disabled={saving === key}>
                  {saving === key ? 'â€¦' : 'Save'}
                </AdminBtn>
                {msgs[key] && (
                  <span className={`text-xs whitespace-nowrap ${msgs[key].startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                    {msgs[key]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}


