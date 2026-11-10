import { useEffect, useState } from 'react'
import { getAllStaff } from '../lib/api'
import { AdminTable, AThead, ATh, ATbody, ATr, ATd, Badge } from '../components/AdminTable'
import type { AdminStaffMember } from '../lib/types'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function StaffAdminPage() {
  const [staff,   setStaff]   = useState<AdminStaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    setLoading(true)
    getAllStaff().then(({ data }) => {
      if (data) setStaff(data)
      setLoading(false)
    })
  }, [])

  const filtered = staff.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.includes(search) || s.synthetic_email.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff Members</h1>
        <span className="text-sm text-gray-500">{filtered.length} total</span>
      </div>

      <input type="text" placeholder="Search by name or roleâ€¦" value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />

      {loading ? <div className="py-8 text-center text-sm text-gray-400">Loadingâ€¦</div> : (
        <AdminTable>
          <AThead>
            <ATh>Name</ATh>
            <ATh>Role</ATh>
            <ATh>Status</ATh>
            <ATh>Owner ID</ATh>
            <ATh>Synthetic email</ATh>
            <ATh>Created</ATh>
          </AThead>
          <ATbody>
            {filtered.map(s => (
              <ATr key={s.id}>
                <ATd><span className="font-medium">{s.name}</span></ATd>
                <ATd><Badge color="gray">{s.role}</Badge></ATd>
                <ATd><Badge color={s.status === 'active' ? 'green' : 'red'}>{s.status}</Badge></ATd>
                <ATd muted><span className="font-mono text-xs">{s.owner_id.slice(0, 8)}â€¦</span></ATd>
                <ATd muted><span className="font-mono text-xs">{s.synthetic_email}</span></ATd>
                <ATd muted>{fmtDate(s.created_at)}</ATd>
              </ATr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-400">No staff members found.</td></tr>
            )}
          </ATbody>
        </AdminTable>
      )}
    </div>
  )
}



