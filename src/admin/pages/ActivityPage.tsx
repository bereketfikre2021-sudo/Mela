import { useEffect, useState } from 'react'
import { getActivityLog } from '../lib/api'
import { AdminTable, AThead, ATh, ATbody, ATr, ATd, Badge } from '../components/AdminTable'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ACTION_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'gray'> = {
  sale: 'green', expense: 'blue', stock_adjustment: 'yellow',
  purchase: 'blue', sale_cancellation: 'red', staff_created: 'gray',
  staff_deactivated: 'yellow', staff_deleted: 'red',
}

type LogEntry = { id: string; owner_id: string; action_type: string; details: Record<string, unknown> | null; created_at: string; performed_by: string | null }

export function ActivityPage() {
  const [logs, setLogs]       = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    getActivityLog(undefined, 200).then(({ data }) => {
      if (data) setLogs(data as LogEntry[])
      setLoading(false)
    })
  }, [])

  const filtered = logs.filter(l =>
    !search || l.action_type.includes(search.toLowerCase()) ||
    l.owner_id.includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <span className="text-sm text-gray-500">Last 200 entries</span>
      </div>

      <input type="text" placeholder="Filter by action or owner IDâ€¦" value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />

      {loading ? <div className="py-8 text-center text-sm text-gray-400">Loadingâ€¦</div> : (
        <AdminTable>
          <AThead>
            <ATh>Action</ATh>
            <ATh>Owner ID</ATh>
            <ATh>Performed by</ATh>
            <ATh>Details</ATh>
            <ATh>Date</ATh>
          </AThead>
          <ATbody>
            {filtered.map(l => (
              <ATr key={l.id}>
                <ATd>
                  <Badge color={ACTION_COLORS[l.action_type] ?? 'gray'}>
                    {l.action_type.replace(/_/g, ' ')}
                  </Badge>
                </ATd>
                <ATd muted><span className="font-mono text-xs">{l.owner_id.slice(0, 8)}â€¦</span></ATd>
                <ATd muted><span className="font-mono text-xs">{l.performed_by ? l.performed_by.slice(0, 8) + 'â€¦' : 'owner'}</span></ATd>
                <ATd muted>
                  {l.details ? (
                    <span className="text-xs">{Object.entries(l.details).map(([k, v]) => `${k}: ${v}`).join(' Â· ')}</span>
                  ) : 'â€”'}
                </ATd>
                <ATd muted>{fmtDate(l.created_at)}</ATd>
              </ATr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No activity found.</td></tr>
            )}
          </ATbody>
        </AdminTable>
      )}
    </div>
  )
}



