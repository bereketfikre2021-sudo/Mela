/** Admin UI components — MediCore-inspired layout, MELA brand colors. */
import type { ReactNode } from 'react'

// ── Card wrapper ──────────────────────────────────────────────────────────────

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm ${className}`} style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      {action && <div className="text-xs">{action}</div>}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, color = 'green' }: {
  label: string; value: string | number; sub?: string; color?: 'green' | 'blue' | 'yellow' | 'red'
}) {
  const accent = {
    green:  { text: '#1C6B53', bg: '#D9F0E4' },
    blue:   { text: '#1d4ed8', bg: '#dbeafe' },
    yellow: { text: '#92400e', bg: '#fef3c7' },
    red:    { text: '#991b1b', bg: '#fee2e2' },
  }[color]
  return (
    <div className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
          <p className="mt-1.5 text-3xl font-bold" style={{ color: accent.text }}>{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className="rounded-xl p-2.5" style={{ backgroundColor: accent.bg }}>
          <div className="h-5 w-5 rounded" style={{ backgroundColor: accent.text, opacity: 0.4 }} />
        </div>
      </div>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function AThead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-gray-100">
        {children}
      </tr>
    </thead>
  )
}

export function ATh({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

export function ATbody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function ATr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={[
        'border-b border-gray-50 transition-colors last:border-0',
        onClick ? 'cursor-pointer hover:bg-gray-50/70' : '',
      ].join(' ')}
    >
      {children}
    </tr>
  )
}

export function ATd({ children, right, muted }: { children: ReactNode; right?: boolean; muted?: boolean }) {
  return (
    <td className={[
      'px-4 py-3.5',
      right ? 'text-right' : '',
      muted ? 'text-gray-400 text-xs' : 'text-gray-700',
    ].join(' ')}>
      {children}
    </td>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

export function Badge({ color, children }: { color: 'green' | 'yellow' | 'red' | 'gray' | 'blue'; children: ReactNode }) {
  const styles = {
    green:  { bg: '#D9F0E4', text: '#1C6B53' },
    yellow: { bg: '#fef3c7', text: '#92400e' },
    red:    { bg: '#fee2e2', text: '#991b1b' },
    gray:   { bg: '#f3f4f6', text: '#6b7280' },
    blue:   { bg: '#dbeafe', text: '#1d4ed8' },
  }[color]
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: styles.bg, color: styles.text }}
    >
      {children}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────

export function AdminBtn({
  children, onClick, variant = 'primary', size = 'md', disabled = false, type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:pointer-events-none'
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm' }
  const variantClass = {
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger:    'text-white hover:opacity-90',
    ghost:     'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
    primary:   'text-white hover:opacity-90',
  }[variant]
  const variantStyle =
    variant === 'primary' ? { backgroundColor: '#1C6B53' } :
    variant === 'danger'  ? { backgroundColor: '#dc2626' } : {}

  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variantClass} ${sizes[size]}`}
      style={variantStyle}>
      {children}
    </button>
  )
}

// ── Form inputs ───────────────────────────────────────────────────────────────

export function AdminInput({
  label, value, onChange, type = 'text', placeholder, helperText, error, readOnly,
}: {
  label?: string; value: string; onChange?: (v: string) => void
  type?: string; placeholder?: string; helperText?: string; error?: string; readOnly?: boolean
}) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={[
          'h-10 w-full rounded-xl border px-3 text-sm text-gray-900 outline-none transition-all',
          readOnly ? 'bg-gray-50 cursor-default border-gray-200' : 'bg-white border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100',
          error ? 'border-red-300' : '',
        ].join(' ')}
      />
      {error      && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-gray-400">{helperText}</p>}
    </div>
  )
}

export function AdminSelect({
  label, value, onChange, options,
}: {
  label?: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none hover:border-gray-300 focus:border-gray-400"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── View all link ─────────────────────────────────────────────────────────────

export function ViewAllLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-gray-50"
      style={{ color: '#1C6B53' }}>
      View All
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
      </svg>
    </button>
  )
}
