/**
 * PaymentMethodsPage — Admin CRUD for payment method accounts.
 * Each method has: label, account holder, account number, extra (bank name),
 * enabled flag, and an imageUrl for the logo (uploaded to Supabase Storage).
 */
import { useEffect, useRef, useState } from 'react'
import { Check, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { getSiteSettings, updateSiteSetting } from '../lib/api'
import { adminSupabase } from '../lib/adminSupabase'
import { AdminBtn, AdminInput } from '../components/AdminTable'

export interface PaymentMethod {
  id: string        // 'telebirr' | 'cbe_birr' | 'bank_transfer' | custom
  label: string
  holder: string
  number: string
  extra: string     // bank name or extra info
  enabled: boolean
  imageUrl: string  // Supabase Storage public URL — empty = show initials fallback
}

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: 'telebirr',      label: 'Telebirr',     holder: 'Bereket Fikre', number: '', extra: '',                            enabled: true,  imageUrl: '' },
  { id: 'cbe_birr',      label: 'CBE Birr',     holder: 'Bereket Fikre', number: '', extra: '',                            enabled: true,  imageUrl: '' },
  { id: 'bank_transfer', label: 'Bank Transfer',holder: 'Bereket Fikre', number: '', extra: 'Commercial Bank of Ethiopia', enabled: true,  imageUrl: '' },
]

const SETTING_KEY  = 'payment_methods_json'
const BUCKET       = 'payment-method-logos'

/** Upload image to Supabase Storage and return public URL. */
async function uploadLogo(file: File, methodId: string): Promise<string | null> {
  if (!adminSupabase) return null
  const ext  = file.name.split('.').pop() ?? 'png'
  const path = `${methodId}.${ext}`

  const { error } = await adminSupabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) { console.error('Upload error:', error.message); return null }

  const { data } = adminSupabase.storage.from(BUCKET).getPublicUrl(path)
  // Add cache-bust to force image refresh
  return `${data.publicUrl}?t=${Date.now()}`
}

/** Logo avatar — image if available, else initials fallback */
function MethodLogo({ method, size = 'md' }: { method: PaymentMethod; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12'
  const txt = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base'
  if (method.imageUrl) {
    return (
      <img
        src={method.imageUrl}
        alt={method.label}
        className={`${dim} rounded-2xl object-cover border border-gray-100 bg-white`}
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}
      />
    )
  }
  return (
    <div className={`${dim} ${txt} rounded-2xl flex items-center justify-center font-bold text-white bg-gray-400`}>
      {method.label.slice(0, 1).toUpperCase()}
    </div>
  )
}

function MethodCard({
  method, onEdit, onToggle, onDelete,
}: {
  method: PaymentMethod
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`rounded-2xl p-5 transition-all ${method.enabled ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
      style={{ boxShadow: method.enabled ? '0 1px 8px rgba(0,0,0,0.07)' : 'none', border: method.enabled ? '1px solid #f0f0f0' : '2px dashed #e5e7eb' }}
    >
      <div className="flex items-start gap-4">
        <MethodLogo method={method} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{method.label}</p>
            {method.enabled
              ? <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: '#D9F0E4', color: '#1C6B53' }}>Active</span>
              : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Disabled</span>
            }
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{method.holder || '—'}</p>
          <p className="text-xs text-gray-400">{method.number || 'No account number set'}</p>
          {method.extra && <p className="text-xs text-gray-400">{method.extra}</p>}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <AdminBtn size="sm" onClick={onEdit} variant="secondary">
          <Pencil className="h-3 w-3" /> Edit
        </AdminBtn>
        <AdminBtn size="sm" onClick={onToggle} variant="ghost">
          {method.enabled ? 'Disable' : 'Enable'}
        </AdminBtn>
        {!['telebirr', 'cbe_birr', 'bank_transfer'].includes(method.id) && (
          <AdminBtn size="sm" onClick={onDelete} variant="danger">
            <Trash2 className="h-3 w-3" />
          </AdminBtn>
        )}
      </div>
    </div>
  )
}

export function PaymentMethodsPage() {
  const [methods,   setMethods]   = useState<PaymentMethod[]>(DEFAULT_METHODS)
  const [editing,   setEditing]   = useState<PaymentMethod | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    getSiteSettings().then(({ data }) => {
      if (data) {
        const row = data.find(s => s.key === SETTING_KEY)
        if (row?.value) {
          try {
            const parsed = JSON.parse(row.value)
            if (Array.isArray(parsed) && parsed.length > 0) setMethods(parsed)
          } catch { /* use defaults */ }
        }
      }
      setLoading(false)
    })
  }, [])

  async function persist(updated: PaymentMethod[]) {
    setSaving(true)
    await updateSiteSetting(SETTING_KEY, JSON.stringify(updated))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleSaveEdit() {
    if (!editing) return
    const updated = methods.some(m => m.id === editing.id)
      ? methods.map(m => m.id === editing.id ? editing : m)
      : [...methods, editing]
    setMethods(updated)
    setEditing(null)
    setPreview(null)
    void persist(updated)
  }

  function handleToggle(id: string) {
    const updated = methods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
    setMethods(updated)
    void persist(updated)
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this payment method?')) return
    const updated = methods.filter(m => m.id !== id)
    setMethods(updated)
    void persist(updated)
  }

  function handleAddNew() {
    setEditing({ id: `custom_${Date.now()}`, label: '', holder: 'Bereket Fikre', number: '', extra: '', enabled: true, imageUrl: '' })
    setPreview(null)
  }

  async function handleLogoUpload(file: File) {
    if (!editing) return
    setUploading(true)
    // Show local preview immediately
    setPreview(URL.createObjectURL(file))
    const url = await uploadLogo(file, editing.id)
    setUploading(false)
    if (url) setEditing(e => e ? { ...e, imageUrl: url } : e)
    else alert('Upload failed — check that the payment-method-logos bucket exists in Supabase Storage.')
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">Loading…</div>

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
          <p className="mt-1 text-sm text-gray-500">Manage payment accounts shown to users. Upload logos for each method.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#1C6B53' }}>
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <AdminBtn onClick={handleAddNew} disabled={saving}>
            <Plus className="h-4 w-4" /> Add method
          </AdminBtn>
        </div>
      </div>

      {/* Methods grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {methods.map(m => (
          <MethodCard key={m.id} method={m}
            onEdit={() => { setEditing({ ...m }); setPreview(m.imageUrl || null) }}
            onToggle={() => handleToggle(m.id)}
            onDelete={() => handleDelete(m.id)}
          />
        ))}
      </div>

      {/* Storage setup note */}
      {!adminSupabase && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          <strong>Note:</strong> Set <code>VITE_SUPABASE_SERVICE_ROLE_KEY</code> to enable logo uploads. Also create a public bucket named <code>payment-method-logos</code> in Supabase Storage.
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              {editing.label || 'New payment method'}
            </h2>

            <div className="space-y-5">
              {/* Logo upload */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Logo image</p>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
                    {(preview || editing.imageUrl) ? (
                      <img src={preview || editing.imageUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-gray-300">
                        {editing.label.slice(0, 1) || '?'}
                      </span>
                    )}
                  </div>
                  {/* Upload button */}
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void handleLogoUpload(f) }}
                    />
                    <AdminBtn size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? 'Uploading…' : 'Upload logo'}
                    </AdminBtn>
                    <p className="mt-1 text-xs text-gray-400">PNG, JPG, SVG — recommended 128×128px</p>
                    {editing.imageUrl && !uploading && (
                      <button type="button" onClick={() => { setEditing(e => e ? { ...e, imageUrl: '' } : e); setPreview(null) }}
                        className="mt-1 text-xs text-red-400 hover:text-red-600">
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <AdminInput label="Method name (e.g. Telebirr)" value={editing.label}
                onChange={v => setEditing(e => e ? { ...e, label: v } : e)} />
              <AdminInput label="Account holder" value={editing.holder}
                onChange={v => setEditing(e => e ? { ...e, holder: v } : e)} />
              <AdminInput label="Account / phone number" value={editing.number}
                onChange={v => setEditing(e => e ? { ...e, number: v } : e)} />
              <AdminInput label="Extra info (bank name, etc.) — optional" value={editing.extra}
                onChange={v => setEditing(e => e ? { ...e, extra: v } : e)} />
            </div>

            <div className="mt-6 flex gap-3">
              <AdminBtn onClick={handleSaveEdit} disabled={saving || uploading}>
                {saving ? 'Saving…' : 'Save'}
              </AdminBtn>
              <AdminBtn variant="ghost" onClick={() => { setEditing(null); setPreview(null) }}>
                Cancel
              </AdminBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
