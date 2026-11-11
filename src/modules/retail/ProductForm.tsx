import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, X } from 'lucide-react'

import { Button } from '../../design-system/Button'
import { Input } from '../../design-system/Input'
import type { Product, ProductInput } from './types'

interface ProductFormProps {
  mode: 'add' | 'edit'
  initial?: Product
  isServiceBased?: boolean
  onSubmit: (input: ProductInput) => Promise<void>
  onCancel: () => void
  submitting: boolean
}

function validate(field: string, value: string, t: (k: string) => string): string {
  switch (field) {
    case 'name':
      return value.trim().length === 0 ? t('validation.required') : ''
    case 'selling_price': {
      const n = parseFloat(value)
      return isNaN(n) || n < 0 ? t('products.form.errors.invalidPrice') : ''
    }
    case 'cost_price': {
      if (value.trim() === '') return ''
      const n = parseFloat(value)
      return isNaN(n) || n < 0 ? t('products.form.errors.invalidPrice') : ''
    }
    case 'stock_quantity': {
      const n = parseFloat(value)
      return isNaN(n) || n < 0 ? t('products.form.errors.invalidQty') : ''
    }
    case 'low_stock_threshold': {
      if (value.trim() === '') return ''
      const n = parseFloat(value)
      return isNaN(n) || n < 0 ? t('products.form.errors.invalidQty') : ''
    }
    case 'unit':
      return value.trim().length === 0 ? t('validation.required') : ''
    default:
      return ''
  }
}

export function ProductForm({ mode, initial, isServiceBased = false, onSubmit, onCancel, submitting }: ProductFormProps) {
  const { t } = useTranslation()
  const imgRef = useRef<HTMLInputElement>(null)

  const [name,         setName]        = useState(initial?.name ?? '')
  const [sellingPrice, setSellingPrice]= useState(initial?.selling_price.toString() ?? '')
  const [costPrice,    setCostPrice]   = useState(initial?.cost_price?.toString() ?? '')
  const [stockQty,     setStockQty]    = useState(
    initial != null ? initial.stock_quantity.toString() : isServiceBased ? '999999' : '1'
  )
  const [unit,         setUnit]        = useState(initial?.unit ?? (isServiceBased ? 'session' : 'pcs'))
  const [threshold,    setThreshold]   = useState(initial?.low_stock_threshold?.toString() ?? '')
  const [barcode,      setBarcode]     = useState(initial?.barcode ?? '')
  const [imageUrl,     setImageUrl]    = useState(initial?.image_url ?? '')
  const [imagePreview, setImagePreview]= useState<string | null>(initial?.image_url ?? null)
  const [errors,       setErrors]      = useState<Record<string, string>>({})

  function blur(field: string, value: string) {
    setErrors(prev => ({ ...prev, [field]: validate(field, value, t) }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Create a local object URL for preview — in production, upload to Supabase Storage
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setImageUrl(url)  // Replace with Storage URL after upload
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
      stock_quantity:      isServiceBased ? 999999 : parseFloat(stockQty),
      unit:                unit.trim(),
      low_stock_threshold: isServiceBased ? null : (threshold.trim() ? parseFloat(threshold) : null),
      image_url:           isServiceBased ? null : (imageUrl.trim() || null),
      barcode:             isServiceBased ? null : (barcode.trim() || null),
    }
    await onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Product image — optional, product businesses only */}
      {!isServiceBased && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-text">{t('products.form.image')}</p>
          <div className="flex items-center gap-3">
            {/* Preview */}
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-background">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  <button type="button"
                    onClick={() => { setImagePreview(null); setImageUrl(''); if (imgRef.current) imgRef.current.value = '' }}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70">
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted">
                  <Camera className="h-6 w-6" />
                </div>
              )}
            </div>
            <div>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <Button type="button" variant="secondary" size="sm" onClick={() => imgRef.current?.click()}>
                {imagePreview ? t('products.form.changeImage') : t('products.form.uploadImage')}
              </Button>
              <p className="mt-1 text-xs text-secondary">{t('products.form.imageHelper')}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Barcode — optional, product businesses only */}
      {!isServiceBased && (
        <Input
          label={t('products.form.barcode')}
          helperText={t('products.form.barcodeHelper')}
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          autoComplete="off"
          maxLength={100}
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
