import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../design-system/Button'
import { Input } from '../../design-system/Input'
import type { Product, ProductInput } from './types'

interface ProductFormProps {
  mode: 'add' | 'edit'
  initial?: Product
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
    case 'unit':
      return value.trim().length === 0 ? t('validation.required') : ''
    default:
      return ''
  }
}

/** Shared product form used for both adding and editing. */
export function ProductForm({ mode, initial, onSubmit, onCancel, submitting }: ProductFormProps) {
  const { t } = useTranslation()

  const [name,          setName]         = useState(initial?.name ?? '')
  const [sku,           setSku]          = useState(initial?.sku ?? '')
  const [sellingPrice,  setSellingPrice] = useState(initial?.selling_price.toString() ?? '')
  const [costPrice,     setCostPrice]    = useState(initial?.cost_price?.toString() ?? '')
  const [stockQty,      setStockQty]     = useState(initial?.stock_quantity.toString() ?? '0')
  const [unit,          setUnit]         = useState(initial?.unit ?? 'pcs')
  const [errors,        setErrors]       = useState<Record<string, string>>({})

  function blur(field: string, value: string) {
    const msg = validate(field, value, t)
    setErrors(prev => ({ ...prev, [field]: msg }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {
      name:           validate('name',           name,         t),
      selling_price:  validate('selling_price',  sellingPrice, t),
      cost_price:     validate('cost_price',     costPrice,    t),
      stock_quantity: validate('stock_quantity', stockQty,     t),
      unit:           validate('unit',           unit,         t),
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    const input: ProductInput = {
      name:           name.trim(),
      sku:            sku.trim() || null,
      selling_price:  parseFloat(sellingPrice),
      cost_price:     costPrice.trim() ? parseFloat(costPrice) : null,
      stock_quantity: parseFloat(stockQty),
      unit:           unit.trim(),
    }
    await onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label={t('products.form.name')}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={e => blur('name', e.target.value)}
        error={errors.name}
        autoComplete="off"
        maxLength={150}
        autoFocus
      />

      <Input
        label={t('products.form.sku')}
        helperText={t('products.form.skuHelper')}
        value={sku}
        onChange={e => setSku(e.target.value)}
        autoComplete="off"
        maxLength={100}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('products.form.sellingPrice')}
          helperText="ETB"
          inputMode="decimal"
          value={sellingPrice}
          onChange={e => setSellingPrice(e.target.value)}
          onBlur={e => blur('selling_price', e.target.value)}
          error={errors.selling_price}
        />
        <Input
          label={t('products.form.costPrice')}
          helperText={t('products.form.costPriceHelper')}
          inputMode="decimal"
          value={costPrice}
          onChange={e => setCostPrice(e.target.value)}
          onBlur={e => blur('cost_price', e.target.value)}
          error={errors.cost_price}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('products.form.stock')}
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
