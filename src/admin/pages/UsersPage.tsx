import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getAllBusinesses, getAllSubscriptions } from '../lib/api'
import { Card, AdminTable, AThead, ATh, ATbody, ATr, ATd, Badge, AdminBtn } from '../components/AdminTable'
import type { AdminBusiness, AdminSubscription } from '../lib/types'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
}

const TYPE_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  retail: 'green', fnb: 'blue', bakery: 'yellow', service: 'gray',
  cosmetics: 'blue', salon: 'yellow',
}

function PlanBadge({ plan, status }: { plan: string; status: string }) {
  if (plan === 'premium' && (status === 'active' || status === 'grace'))
    return <Badge color="green">Premium</Badge>
  if (plan === 'premium' && status === 'pending_payment')
    return <Badge color="yellow">Pending</Badge>
  if (plan === 'premium' && (status === 'expired' || status === 'cancelled'))
    return <Badge color="red">Expired</Badge>
  return <Badge color="gray">Free</Badge>
}

export function UsersPage() {
  const navigate = useNavigate()
  const [businesses, setBusinesses]   = useState<AdminBusiness[]>([])
  const [subMap, setSubMap]           = useState<Record<string, AdminSubscription>>({})
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getAllBusinesses(), getAllSubscriptions()]).then(([bizRes, subRes]) => {
      if (bizRes.data) setBusinesses(bizRes.data)
      if (subRes.data) {
        const map: Record<string, AdminSubscription> = {}
        subRes.data.forEach(s => { map[s.owner_id] = s })
        setSubMap(map)
      }
      // If no data and error mentions service-role, show config warning
      if (!bizRes.data && bizRes.error) {
        console.warn('[Admin] getAllBusinesses error:', bizRes.error.message)
      }
      setLoading(false)
    })
  }, [])

  const filtered = businesses.filter(b =>
    !search ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    b.phone.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users & Businesses</h1>
        <span className="text-sm text-gray-500">{filtered.length} total</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, owner or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-300 bg-white"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
      ) : businesses.length === 0 ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
          <p className="font-semibold">No users found</p>
          <p className="mt-1">Make sure <code className="bg-yellow-100 px-1 rounded">VITE_SUPABASE_SERVICE_ROLE_KEY</code> is set in your Vercel environment variables. The admin panel requires the service-role key to read cross-owner data.</p>
        </div>
      ) : (
        <Card>
          <AdminTable>
            <AThead>
              <ATh>Business</ATh>
              <ATh>Owner</ATh>
              <ATh>Phone</ATh>
              <ATh>Type</ATh>
              <ATh>Plan</ATh>
              <ATh>Joined</ATh>
              <ATh>Action</ATh>
            </AThead>
            <ATbody>
              {filtered.map(b => {
                const sub = subMap[b.owner_id]
                return (
                  <ATr key={b.id} onClick={() => navigate(`/admin/users/${b.owner_id}`)}>
                    <ATd><span className="font-medium">{b.name}</span></ATd>
                    <ATd>{b.owner_name}</ATd>
                    <ATd muted>{b.phone}</ATd>
                    <ATd><Badge color={TYPE_COLORS[b.type] ?? 'gray'}>{b.type}</Badge></ATd>
                    <ATd>
                      {sub
                        ? <PlanBadge plan={sub.plan} status={sub.status} />
                        : <Badge color="gray">Free</Badge>
                      }
                    </ATd>
                    <ATd muted>{fmtDate(b.created_at)}</ATd>
                    <ATd>
                      <div onClick={e => e.stopPropagation()}>
                        <AdminBtn size="sm" variant="secondary"
                          onClick={() => navigate(`/admin/users/${b.owner_id}`)}>
                          View
                        </AdminBtn>
                      </div>
                    </ATd>
                  </ATr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-400">No businesses found.</td></tr>
              )}
            </ATbody>
          </AdminTable>
        </Card>
      )}
    </div>
  )
}
