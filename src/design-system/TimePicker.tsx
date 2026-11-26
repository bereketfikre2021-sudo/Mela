/**
 * TimePicker
 *
 * A branded hour/minute picker that replaces the native <input type="time">.
 * Renders two scrollable columns (hours 1–12 and minutes 00/15/30/45) plus
 * an AM/PM toggle, all using the app's design tokens.
 */
import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from './cn'

interface TimePickerProps {
  label?: string
  helperText?: string
  /** 24-hour "HH:MM" string, e.g. "18:30". Empty string = no value. */
  value: string
  onChange: (value: string) => void
  error?: string
}

const HOURS   = Array.from({ length: 12 }, (_, i) => i + 1)   // 1 – 12
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

/** Parse a 24-h "HH:MM" string into { hour12, minute, ampm }. */
function parse(value: string): { h: number; m: number; ampm: 'AM' | 'PM' } {
  const [hStr, mStr] = value.split(':')
  const h24 = parseInt(hStr ?? '0', 10)
  const m   = parseInt(mStr ?? '0', 10)
  const ampm: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return { h: h12, m, ampm }
}

/** Convert { hour12, minute, ampm } → "HH:MM" (24-hour). */
function format(h12: number, m: number, ampm: 'AM' | 'PM'): string {
  let h24 = h12 % 12
  if (ampm === 'PM') h24 += 12
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function ScrollColumn<T extends number>({
  items,
  selected,
  onSelect,
  display,
}: {
  items: T[]
  selected: T
  onSelect: (v: T) => void
  display: (v: T) => string
}) {
  const listRef  = useRef<HTMLDivElement>(null)
  const ITEM_H   = 40

  // Scroll selected item into the centre on mount and when selection changes.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const idx = items.indexOf(selected)
    el.scrollTo({ top: idx * ITEM_H - ITEM_H, behavior: 'smooth' })
  }, [selected, items])

  return (
    <div
      ref={listRef}
      className="flex h-[160px] flex-col overflow-y-auto scroll-smooth overscroll-contain
                 scrollbar-hide snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* top padding so first item can be centred */}
      <div className="shrink-0" style={{ height: ITEM_H }} />
      {items.map(item => {
        const active = item === selected
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            style={{ height: ITEM_H, minHeight: ITEM_H }}
            className={cn(
              'flex shrink-0 snap-center items-center justify-center rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-white'
                : 'text-text hover:bg-background'
            )}
          >
            {display(item)}
          </button>
        )
      })}
      {/* bottom padding */}
      <div className="shrink-0" style={{ height: ITEM_H }} />
    </div>
  )
}

export function TimePicker({ label, helperText, value, onChange, error }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)

  const hasValue = Boolean(value)
  const { h, m, ampm } = hasValue ? parse(value) : { h: 6, m: 0, ampm: 'PM' as const }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function setH(newH: number)              { onChange(format(newH, m,    ampm)); setOpen(true) }
  function setM(newM: number)              { onChange(format(h,    newM, ampm)); setOpen(true) }
  function setAmpm(ap: 'AM' | 'PM')        { onChange(format(h,    m,    ap));   setOpen(true) }

  const displayValue = hasValue
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
    : ''

  const helperId = 'tp-helper'
  const errorId  = 'tp-error'

  return (
    <div ref={ref} className="relative w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border bg-surface px-3 text-sm transition-colors',
          'text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          open  ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50',
          error ? 'border-danger' : ''
        )}
      >
        <Clock className="h-4 w-4 shrink-0 text-muted" />
        <span className={cn('flex-1', hasValue ? 'text-text' : 'text-muted')}>
          {hasValue ? displayValue : 'Select time…'}
        </span>
        {hasValue && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange('') }}
            className="ml-auto text-xs text-secondary hover:text-danger"
            aria-label="Clear time"
          >
            ✕
          </button>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="dialog"
          aria-label="Time picker"
          className={cn(
            'absolute left-0 z-50 mt-2 w-64 rounded-xl border border-border bg-surface shadow-lg',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
        >
          <div className="flex items-stretch divide-x divide-border">
            {/* Hours */}
            <div className="flex-1 px-1 py-2">
              <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-secondary">
                Hour
              </p>
              <ScrollColumn
                items={HOURS}
                selected={h}
                onSelect={setH}
                display={v => String(v).padStart(2, '0')}
              />
            </div>

            {/* Minutes */}
            <div className="flex-1 px-1 py-2">
              <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-secondary">
                Min
              </p>
              <ScrollColumn
                items={MINUTES}
                selected={MINUTES.includes(m) ? m : MINUTES.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a)}
                onSelect={setM}
                display={v => String(v).padStart(2, '0')}
              />
            </div>

            {/* AM / PM */}
            <div className="flex w-16 flex-col items-center justify-center gap-2 px-2 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary">
                AM/PM
              </p>
              {(['AM', 'PM'] as const).map(ap => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => setAmpm(ap)}
                  className={cn(
                    'w-full rounded-lg py-2 text-sm font-semibold transition-colors',
                    ampm === ap
                      ? 'bg-primary text-white'
                      : 'text-text hover:bg-background'
                  )}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>

          {/* Done */}
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger">{error}</p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-xs text-secondary">{helperText}</p>
      ) : null}
    </div>
  )
}
