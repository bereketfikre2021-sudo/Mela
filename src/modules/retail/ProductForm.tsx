import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../design-system/Button'
import { Input } from '../../design-system/Input'
import type { Product, ProductInput } from './types'

interface ProductFormProps {
  mode: 'add' | 'edit'
  initial?: Product
  /** When true, hides stock fields and submits a large stock quantity automatically */
  isServiceBased?: boolean
  onSubmit: (input: ProductInput) => Promise<void>
  onCancel: () => void
  submitting: boolean
}

/** Validate a field and return an error string (empty = no error). */
function validate(field: string, value: string, t: (k: string) => string): string {
  switch (field) {
    case 'name':
      return value.trim().length === 0 ? t('validation.required') : ''
    case 'selling_price': {
      const n = parseFloat(value)
      return isNaN(n) || n < 0 ? t('products.form.errors.invalidPrice') : ''
    }
    case 'cost_price': {
      if (value.trim() === '') return '' // optional
      const n = parseFloat(value)
      return isNaN(n) || n < 0 ? t('products.form.errors.invalidPrice') : ''
    }
    case 'stock_quantity': {
      const n = parseFloat(value)
      return isNaN(n) || n < 0 ? t('products.form.errors.invalidQty') : ''
    }
    case 'low_stock_threshold': {
      if (value.trim() === '') return '' // optional
      const n = parseFloat(value)
      return isNaN(n) || n < 0 ? t('products.form.errors.invalidQty') : ''
    }
    case 'unit':
      return value.trim().length === 0 ? t('validation.required') : ''
    default:
      return ''
  }
}

/** Shared product form used for both adding and editing. */
export function ProductForm({ mode, initial, isServiceBased = false, onSubmit, onCancel, submitting }: ProductFormProps) {
  const { t } = useTranslation()

  const [name,          setName]         = useState(initial?.name ?? '')
  const [sellingPrice,  setSellingPrice] = useState(initial?.selling_price.toString() ?? '')
  const [costPrice,     setCostPrice]    = useState(initial?.cost_price?.toString() ?? '')
  // Service businesses: stock is not tracked, default to large number so POS never blocks
  // Product businesses: default to 1 for new products (more practical than 0)
  const [stockQty, setStockQty] = useState(
    initial != null
      ? initial.stock_quantity.toString()
      : isServiceBased ? '999999' : '1'
  )
  const [unit,          setUnit]         = useState(initial?.unit ?? (isServiceBased ? 'session' : 'pcs'))
  const [threshold,     setThreshold]    = useState(initial?.low_stock_threshold?.toString() ?? '')
  const [errors,        setErrors]       = useState<Record<string, string>>({})

  function blur(field: string, value: string) {
    const msg = validate(field, value, t)
    setErrors(prev => ({ ...prev, [field]: msg }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {
      name:                validate('name',                name,         t),
      selling_price:       validate('selling_price',       sellingPrice, t),
      cost_price:          validate('cost_price',          costPrice,    t),
      stock_quantity:      validate('stock_quantity',      stockQty,     t),
      unit:                validate('unit',                unit,         t),
      low_stock_threshold: validate('low_stock_threshold', threshold,    t),
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    const input: ProductInput = {
      name:                name.trim(),
      sku:                 null,
      selling_price:       parseFloat(sellingPrice),
      cost_price:          costPrice.trim() ? parseFloat(costPrice) : null,
      // Service businesses never run out — use a large fixed quantity
      stock_quantity:      isServiceBased ? 999999 : parseFloat(stockQty),
      unit:                unit.trim(),
      low_stock_threshold: isServiceBased ? null : (threshold.trim() ? parseFloat(threshold) : null),
    }
    await onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label={isServiceBased ? t('products.form.serviceName') : t('products.form.name')}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={e => blur('name', e.target.value)}
        error={errors.name}
        autoComplete="off"
        maxLength={150}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={isServiceBased ? t('products.form.servicePrice') : t('products.form.sellingPrice')}
          helperText="ETB"
          inputMode="decimal"
          value={sellingPrice}
          onChange={e => setSellingPrice(e.target.value)}
          onBlur={e => blur('selling_price', e.target.value)}
          error={errors.selling_price}
        />
        {/* Cost price — hide for service businesses (no cost of goods) */}
        {!isServiceBased && (
          <Input
            label={t('products.form.costPrice')}
            helperText={t('products.form.costPriceHelper')}
            inputMode="decimal"
            value={costPrice}
            onChange={e => setCostPrice(e.target.value)}
            onBlur={e => blur('cost_price', e.target.value)}
            error={errors.cost_price}
          />
        )}
      </div>

      {/* Stock + unit — hidden for service businesses */}
      {!isServiceBased && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('products.form.stock')}
            type="text"
            inputMode="decimal"
            value={stockQty}
            onChange={e => setStockQty(e.target.value)}
            onBlur={e => blur('stock_quantity', e.target.value)}
            error={errors.stock_quantity}
          />
          <Input
            label={t('products.form.unit')}
            helperText={t('products.form.unitHelper')}
            value={unit}
            onChange={e => setUnit(e.target.value)}
            onBlur={e => blur('unit', e.target.value)}
            error={errors.unit}
            maxLength={30}
          />
        </div>
      )}

      {/* Low stock threshold — hidden for service businesses */}
      {!isServiceBased && (
        <Input
          label={t('products.form.lowStockThreshold')}
          helperText={t('products.form.lowStockThresholdHelper')}
          inputMode="decimal"
          value={threshold}
          onChange={e => setThreshold(e.target.value)}
          onBlur={e => blur('low_stock_threshold', e.target.value)}
          error={errors.low_stock_threshold}
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {mode === 'add' ? t('products.form.submitAdd') : t('products.form.submitEdit')}
        </Button>
      </div>
    </form>
  )
}
