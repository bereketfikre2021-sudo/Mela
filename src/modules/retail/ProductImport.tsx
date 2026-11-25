/**
 * ProductImport
 *
 * Lets users bulk-import products from an Excel (.xlsx/.xls) or CSV file.
 *
 * Flow:
 *  1. User downloads the template (optional)
 *  2. User picks a file
 *  3. App parses and shows a preview of the first 5 rows + column map
 *  4. User confirms — app imports row by row with a progress bar
 *  5. Summary: X imported, Y skipped (with reasons)
 *
 * Required columns (case-insensitive, trimmed):
 *   name         — product name (required)
 *   price        — selling price (required, > 0)
 *
 * Optional columns:
 *   sku          — SKU / code
 *   cost         — cost price
 *   stock        — opening stock quantity (default 0)
 *   unit         — unit of measure (default 'pcs')
 *   barcode      — barcode
 *   low_stock    — low stock alert threshold
 */
import { useRef, useState } from 'react'
import { read, utils } from 'xlsx'
import { Download, FileSpreadsheet, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../design-system/Button'
import { createProduct } from './api'
import type { ProductInput } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ParsedRow {
  name:           string
  selling_price:  number
  sku:            string | null
  cost_price:     number | null
  stock_quantity: number
  unit:           string
  barcode:        string | null
  low_stock_threshold: number | null
}

interface ImportResult {
  total:    number
  imported: number
  skipped:  { row: number; name: string; reason: string }[]
}

interface ProductImportProps {
  userId:        string
  isServiceBased: boolean
  onDone:        () => void
  onCancel:      () => void
}

// ── Column aliases ────────────────────────────────────────────────────────────
// Maps whatever header the user has → our internal field name
const COLUMN_ALIASES: Record<string, keyof ParsedRow> = {
  // name
  'name': 'name', 'product': 'name', 'product name': 'name',
  'item': 'name', 'item name': 'name', 'description': 'name',
  'ስም': 'name', 'ምርት': 'name',
  // selling_price
  'price': 'selling_price', 'selling price': 'selling_price',
  'sell price': 'selling_price', 'sale price': 'selling_price',
  'unit price': 'selling_price', 'retail price': 'selling_price',
  'ዋጋ': 'selling_price', 'የሽያጭ ዋጋ': 'selling_price',
  // sku
  'sku': 'sku', 'code': 'sku', 'item code': 'sku', 'product code': 'sku',
  // cost_price
  'cost': 'cost_price', 'cost price': 'cost_price', 'purchase price': 'cost_price',
  'unit cost': 'cost_price', 'የምርት ወጪ': 'cost_price',
  // stock_quantity
  'stock': 'stock_quantity', 'quantity': 'stock_quantity', 'qty': 'stock_quantity',
  'opening stock': 'stock_quantity', 'stock quantity': 'stock_quantity',
  'ክምችት': 'stock_quantity',
  // unit
  'unit': 'unit', 'uom': 'unit', 'measure': 'unit', 'unit of measure': 'unit',
  'መለኪያ': 'unit',
  // barcode
  'barcode': 'barcode', 'bar code': 'barcode', 'ean': 'barcode', 'upc': 'barcode',
  // low_stock_threshold
  'low stock': 'low_stock_threshold', 'low_stock': 'low_stock_threshold',
  'reorder point': 'low_stock_threshold', 'min stock': 'low_stock_threshold',
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function parseRows(rawRows: Record<string, unknown>[]): ParsedRow[] {
  return rawRows.map(row => {
    // Build a normalized key → value map
    const norm: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      const alias = COLUMN_ALIASES[normalizeHeader(k)]
      if (alias) norm[alias] = v
    }

    return {
      name:                String(norm.name ?? '').trim(),
      selling_price:       parseNumber(norm.selling_price) ?? 0,
      sku:                 norm.sku ? String(norm.sku).trim() : null,
      cost_price:          parseNumber(norm.cost_price),
      stock_quantity:      parseNumber(norm.stock_quantity) ?? 0,
      unit:                String(norm.unit ?? 'pcs').trim() || 'pcs',
      barcode:             norm.barcode ? String(norm.barcode).trim() : null,
      low_stock_threshold: parseNumber(norm.low_stock_threshold),
    }
  })
}

function validateRow(row: ParsedRow): string | null {
  if (!row.name || row.name.length < 1) return 'Name is required'
  if (row.name.length > 200)            return 'Name is too long (max 200 chars)'
  if (row.selling_price <= 0)           return 'Price must be greater than 0'
  if (row.stock_quantity < 0)           return 'Stock cannot be negative'
  if (row.cost_price !== null && row.cost_price < 0) return 'Cost cannot be negative'
  return null
}

// ── Template download ─────────────────────────────────────────────────────────
function downloadTemplate(isService: boolean) {
  const headers = ['name', 'price', 'cost', 'stock', 'unit', 'sku', 'barcode', 'low_stock']
  const example = isService
    ? [['Phone screen repair', 400, 150, '', 'job', 'SVC-001', '', '']]
    : [
        ['Water 500ml',   15,  10, 50, 'pcs', 'PRD-001', '', 10],
        ['Notebook A4',   55,  35, 20, 'pcs', 'PRD-002', '', 5],
      ]

  const ws = utils.aoa_to_sheet([headers, ...example])
  // Set column widths
  ws['!cols'] = headers.map(() => ({ wch: 18 }))

  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Products')

  // Dynamic import to keep bundle lean
  import('xlsx').then(({ writeFile }) => {
    writeFile(wb, 'mela_products_template.xlsx')
  })
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProductImport({ userId, isServiceBased, onDone, onCancel }: ProductImportProps) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)

  const [stage,    setStage]    = useState<'idle' | 'preview' | 'importing' | 'done'>('idle')
  const [rows,     setRows]     = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState(0)
  const [result,   setResult]   = useState<ImportResult | null>(null)
  const [parseErr, setParseErr] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseErr('')
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      if (raw.length === 0) {
        setParseErr('The file appears to be empty. Make sure it has a header row and at least one data row.')
        return
      }

      const parsed = parseRows(raw)
      setRows(parsed)
      setStage('preview')
    } catch {
      setParseErr('Could not read this file. Please use .xlsx, .xls, or .csv format.')
    }

    // Reset input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleImport() {
    setStage('importing')
    setProgress(0)

    const skipped: ImportResult['skipped'] = []
    let imported = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const err = validateRow(row)
      if (err) {
        skipped.push({ row: i + 2, name: row.name || `Row ${i + 2}`, reason: err })
        setProgress(Math.round(((i + 1) / rows.length) * 100))
        continue
      }

      const input: ProductInput = {
        name:                row.name,
        sku:                 row.sku,
        selling_price:       row.selling_price,
        cost_price:          row.cost_price,
        stock_quantity:      isServiceBased ? 999999 : row.stock_quantity,
        unit:                row.unit,
        low_stock_threshold: row.low_stock_threshold,
        image_url:           null,
        barcode:             row.barcode,
      }

      const { error } = await createProduct(input, userId)
      if (error) {
        skipped.push({ row: i + 2, name: row.name, reason: error.message })
      } else {
        imported++
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100))
    }

    setResult({ total: rows.length, imported, skipped })
    setStage('done')
  }

  // ── Idle: file picker ──────────────────────────────────────────────────────
  if (stage === 'idle') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary">{t('products.import.subtitle')}</p>

        {/* Template download */}
        <button
          type="button"
          onClick={() => downloadTemplate(isServiceBased)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary-soft px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Download className="h-4 w-4" />
          {t('products.import.downloadTemplate')}
        </button>

        {/* File input */}
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-background py-8 transition-colors hover:border-primary/50 hover:bg-primary-soft/30"
        >
          <FileSpreadsheet className="h-10 w-10 text-secondary" />
          <div className="text-center">
            <p className="text-sm font-medium text-text">{t('products.import.dropzone')}</p>
            <p className="mt-0.5 text-xs text-secondary">.xlsx, .xls, .csv</p>
          </div>
          <Button size="sm" variant="secondary" type="button">
            {t('products.import.browse')}
          </Button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
        />

        {parseErr && (
          <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{parseErr}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
        </div>
      </div>
    )
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  if (stage === 'preview') {
    const preview  = rows.slice(0, 5)
    const validCnt = rows.filter(r => !validateRow(r)).length
    const badCnt   = rows.length - validCnt

    return (
      <div className="flex flex-col gap-4">
        {/* File info */}
        <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
          <FileSpreadsheet className="h-4 w-4 text-secondary" />
          <span className="text-sm text-text">{fileName}</span>
          <span className="ml-auto text-xs text-secondary">{rows.length} {t('products.import.rows')}</span>
          <button type="button" onClick={() => setStage('idle')} className="ml-1 rounded p-0.5 text-secondary hover:text-danger">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-center">
            <p className="text-lg font-bold text-success">{validCnt}</p>
            <p className="text-xs text-secondary">{t('products.import.willImport')}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center ${badCnt > 0 ? 'border-warning/30 bg-warning-soft' : 'border-border bg-background'}`}>
            <p className={`text-lg font-bold ${badCnt > 0 ? 'text-warning' : 'text-secondary'}`}>{badCnt}</p>
            <p className="text-xs text-secondary">{t('products.import.willSkip')}</p>
          </div>
        </div>

        {/* Preview table */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
            {t('products.import.preview')}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-xs">
              <thead className="bg-background">
                <tr>
                  {['Name','Price','Cost','Stock','Unit'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-secondary">{h}</th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium text-secondary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.map((row, i) => {
                  const err = validateRow(row)
                  return (
                    <tr key={i} className={err ? 'bg-danger-soft/30' : ''}>
                      <td className="px-3 py-2 font-medium text-text">{row.name || <span className="text-danger">—</span>}</td>
                      <td className="px-3 py-2 text-text">{row.selling_price > 0 ? `ETB ${row.selling_price}` : <span className="text-danger">—</span>}</td>
                      <td className="px-3 py-2 text-secondary">{row.cost_price != null ? `ETB ${row.cost_price}` : '—'}</td>
                      <td className="px-3 py-2 text-secondary">{row.stock_quantity}</td>
                      <td className="px-3 py-2 text-secondary">{row.unit}</td>
                      <td className="px-3 py-2">
                        {err
                          ? <span className="text-danger">{err}</span>
                          : <span className="text-success">✓</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length > 5 && (
              <p className="px-3 py-2 text-center text-xs text-secondary">
                +{rows.length - 5} {t('products.import.moreRows')}
              </p>
            )}
          </div>
        </div>

        {validCnt === 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('products.import.noValidRows')}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStage('idle')} fullWidth>
            {t('common.back')}
          </Button>
          <Button
            onClick={() => void handleImport()}
            disabled={validCnt === 0}
            fullWidth
            leadingIcon={<Upload className="h-4 w-4" />}
          >
            {t('products.import.importBtn', { count: validCnt })}
          </Button>
        </div>
      </div>
    )
  }

  // ── Importing (progress) ───────────────────────────────────────────────────
  if (stage === 'importing') {
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <FileSpreadsheet className="h-12 w-12 text-primary" />
        <div className="w-full">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-secondary">{t('products.import.importing')}</span>
            <span className="font-medium text-text">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-secondary">{t('products.import.pleaseWait')}</p>
      </div>
    )
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (stage === 'done' && result) {
    return (
      <div className="flex flex-col gap-4">
        {/* Summary */}
        <div className="flex flex-col items-center gap-2 py-2">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-lg font-semibold text-text">
            {t('products.import.doneTitle', { imported: result.imported, total: result.total })}
          </p>
        </div>

        {/* Skipped rows */}
        {result.skipped.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              {t('products.import.skippedTitle', { count: result.skipped.length })}
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              {result.skipped.map((s, i) => (
                <div key={i} className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0">
                  <span className="shrink-0 text-xs text-muted">Row {s.row}</span>
                  <span className="flex-1 text-xs font-medium text-text truncate">{s.name}</span>
                  <span className="shrink-0 text-xs text-danger">{s.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={onDone} fullWidth>
          {t('products.import.close')}
        </Button>
      </div>
    )
  }

  return null
}
