import { useMemo, useState } from 'react'
import { Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { Input } from '../design-system/Input'
import { EmptyState } from '../design-system/EmptyState'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { Select } from '../design-system/Select'
import { useAuth } from '../modules/auth/AuthContext'
import { completeSale } from '../modules/retail/salesApi'
import { enqueueSale } from '../lib/offlineQueue'
import { useSyncContext } from '../context/SyncContext'
import { getBusinessConfig } from '../modules/auth/businessConfig'
import { useProducts } from '../modules/retail/useProducts'
import type { CartItem, PaymentMethod } from '../modules/retail/types'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'

/** Generate a simple sale reference: S-YYYYMMDD-XXXX */
function genSaleNumber(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `S-${date}-${rand}`
}

function fmtPrice(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Point-of-sale screen — Phase 2.3. */
export function PosPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const bizConfig = getBusinessConfig(profile?.type ?? 'retail')
  const { products, status, reload: reloadProducts } = useProducts()
  const { notify } = useNotification()
  const { usageCounts, limits, isActive } = useSubscription()

  const { isOnline, refreshCount } = useSyncContext()

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [submitting, setSubmitting] = useState(false)
  const [salesBannerDismissed, setSalesBannerDismissed] = useState(false)
  // One UUID per checkout attempt. Regenerated after each successful sale or
  // when the dialog is opened, so retries on the same open dialog are safe.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())

  const showSalesBanner =
    !salesBannerDismissed &&
    !isActive &&
    limits !== null &&
    limits.max_sales_per_month > 0 &&
    usageCounts.salesThisMonth / limits.max_sales_per_month >= 0.8

  function openCheckout() {
    setIdempotencyKey(crypto.randomUUID()) // fresh key for this attempt
    setCheckoutOpen(true)
  }

  // ── Filtered product list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    )
  }, [products, search])

  // ── Cart helpers ───────────────────────────────────────────────────────────
  function cartQty(productId: string): number {
    return cart.find(c => c.product.id === productId)?.quantity ?? 0
  }

  function addToCart(productId: string) {
    const product = products.find(p => p.id === productId)
    if (!product) return
    setCart(prev => {
      const existing = prev.find(c => c.product.id === productId)
      if (existing) {
        // Service-based: no stock cap — can always add more
        if (!bizConfig.isServiceBased && existing.quantity >= product.stock_quantity) return prev
        return prev.map(c => c.product.id === productId
          ? { ...c, quantity: c.quantity + 1 }
          : c)
      }
      // Service-based: zero stock_quantity is normal — don't block adding
      if (!bizConfig.isServiceBased && product.stock_quantity < 1) return prev
      return [...prev, { product, quantity: 1 }]
    })
  }

  function decreaseQty(productId: string) {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === productId)
      if (!existing) return prev
      if (existing.quantity <= 1) return prev.filter(c => c.product.id !== productId)
      return prev.map(c => c.product.id === productId
        ? { ...c, quantity: c.quantity - 1 }
        : c)
    })
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(c => c.product.id !== productId))
  }

  function clearCart() { setCart([]) }

  const subtotal = cart.reduce((s, c) => s + c.product.selling_price * c.quantity, 0)

  // ── Checkout ───────────────────────────────────────────────────────────────
  async function handleCheckout() {
    if (!user || cart.length === 0) return
    setSubmitting(true)

    const payload = {
      owner_id:        user.id,
      sale_number:     genSaleNumber(),
      payment_method:  paymentMethod,
      idempotency_key: idempotencyKey,
      items:           cart.map(c => ({ product_id: c.product.id, quantity: c.quantity })),
    }

    // If offline, queue for later sync — stock NOT deducted until synced
    if (!isOnline) {
      await enqueueSale(payload)
      await refreshCount()
      setSubmitting(false)
      notify({ tone: 'warning', title: t('sync.savedOffline'), description: t('sync.savedOfflineDesc') })
      clearCart()
      setCheckoutOpen(false)
      return
    }

    const { data, error } = await completeSale(payload)
    setSubmitting(false)

    if (error) {
      // Network failure while nominally online — queue it
      if (!navigator.onLine || error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
        await enqueueSale(payload)
        await refreshCount()
        notify({ tone: 'warning', title: t('sync.savedOffline'), description: t('sync.savedOfflineDesc') })
        clearCart()
        setCheckoutOpen(false)
        return
      }
      notify({ tone: 'danger', title: t('pos.checkoutResult.error'), description: error.message })
      return
    }
    const isPending = data?.payment_status === 'pending'
    notify({
      tone: isPending ? 'warning' : 'success',
      title: isPending ? t('pos.checkoutResult.successPending') : t('pos.checkoutResult.success'),
    })
    clearCart()
    setCheckoutOpen(false)
    await reloadProducts()
  }

  const paymentOptions = [
    { value: 'cash',          label: t('pos.payment.cash') },
    { value: 'telebirr',      label: t('pos.payment.telebirr') },
    { value: 'bank_transfer', label: t('pos.payment.bank_transfer') },
  ]

  // ── Loading / no products ──────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10 space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="py-6 md:py-10">
        <EmptyState
          icon={ShoppingCart}
          title={t('notification.error.title')}
          description={t('notification.error.desc')}
          action={<Button variant="secondary" onClick={() => void reloadProducts()}>{t('products.retry')}</Button>}
        />
      </div>
    )
  }

  return (
    <>
      {/* ── Two-column layout on md+; single column on mobile ─────────────── */}
      <div className="py-6 md:py-10">
        {showSalesBanner && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning">
            <span>
              {t('subscription.salesLimitWarning', {
                used: usageCounts.salesThisMonth,
                max: limits!.max_sales_per_month,
              })}
            </span>
            <button
              type="button"
              onClick={() => setSalesBannerDismissed(true)}
              aria-label={t('common.close')}
              className="shrink-0 rounded p-0.5 hover:opacity-70"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <h1 className="heading mb-4 text-2xl md:text-3xl">{t('pos.title')}</h1>

        <div className="flex flex-col gap-6 md:flex-row md:items-start">

          {/* ── Product search + grid ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <Input
              placeholder={bizConfig.posSearchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label={bizConfig.posSearchPlaceholder}
            />

            {filtered.length === 0 ? (
              <p className="mt-6 text-center text-sm text-secondary">
                {search ? t('pos.noResults') : t('products.empty.title')}
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filtered.map(p => {
                  const inCart = cartQty(p.id)
                  // Service-based: never "out of stock" — stock_quantity is unused
                  const outOfStock = bizConfig.isServiceBased ? false : p.stock_quantity === 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => addToCart(p.id)}
                      className={[
                        'flex flex-col rounded-lg border p-3 text-left transition-colors',
                        outOfStock
                          ? 'cursor-not-allowed border-border bg-background opacity-50'
                          : inCart > 0
                            ? 'border-primary bg-primary-soft'
                            : 'border-border bg-surface hover:border-primary-interactive hover:bg-primary-soft/40',
                      ].join(' ')}
                    >
                      <span className="truncate text-sm font-medium text-text">{p.name}</span>
                      {p.sku && <span className="mt-0.5 truncate text-xs text-secondary">{p.sku}</span>}
                      <span className="mt-2 text-sm font-semibold text-figures text-text">
                        {fmtPrice(p.selling_price)}
                      </span>
                      {/* Hide stock count for service-based businesses */}
                      {!bizConfig.isServiceBased && (
                        <span className={[
                          'mt-0.5 text-xs',
                          p.stock_quantity <= 3 ? 'text-warning' : 'text-secondary'
                        ].join(' ')}>
                          {t('pos.stock', { qty: p.stock_quantity, unit: p.unit })}
                          {inCart > 0 && ` · ${t('pos.inCart', { qty: inCart })}`}
                        </span>
                      )}
                      {bizConfig.isServiceBased && inCart > 0 && (
                        <span className="mt-0.5 text-xs text-secondary">
                          {t('pos.inCart', { qty: inCart })}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Cart ──────────────────────────────────────────────────────── */}
          <div className="w-full md:w-80 shrink-0">
            <div className="rounded-lg border border-border bg-surface">
              {/* Cart header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold text-text">
                  {bizConfig.posCartLabel}
                  {cart.length > 0 && (
                    <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                      {cart.length}
                    </span>
                  )}
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-secondary hover:text-danger"
                  >
                    {t('pos.clearCart')}
                  </button>
                )}
              </div>

              {/* Cart items */}
              {cart.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-muted" aria-hidden="true" />
                  <p className="text-sm text-secondary">{t('pos.cartEmpty')}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {cart.map(item => (
                    <li key={item.product.id} className="flex items-center gap-2 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{item.product.name}</p>
                        <p className="text-xs text-secondary">{fmtPrice(item.product.selling_price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => decreaseQty(item.product.id)}
                          aria-label={t('pos.decrease')}
                          className="rounded p-1 text-secondary hover:bg-background hover:text-text"
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <span className="w-6 text-center text-sm text-figures font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(item.product.id)}
                          disabled={item.quantity >= item.product.stock_quantity}
                          aria-label={t('pos.increase')}
                          className="rounded p-1 text-secondary hover:bg-background hover:text-text disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="w-20 text-right text-sm text-figures font-medium">
                        {fmtPrice(item.product.selling_price * item.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        aria-label={t('pos.remove', { name: item.product.name })}
                        className="ml-1 rounded p-1 text-secondary hover:bg-danger-soft hover:text-danger"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Totals + checkout */}
              <div className="border-t border-border px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">{t('pos.subtotal')}</span>
                  <span className="text-figures font-semibold">{fmtPrice(subtotal)}</span>
                </div>
                <Button
                  fullWidth
                  size="lg"
                  className="mt-3"
                  disabled={cart.length === 0}
                  onClick={openCheckout}
                >
                  {t('pos.checkout')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Checkout dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={checkoutOpen}
        onOpenChange={open => { if (!open && !submitting) setCheckoutOpen(false) }}
        title={t('pos.checkout')}
        closeLabel={t('common.cancel')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCheckoutOpen(false)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button loading={submitting} onClick={() => void handleCheckout()}>
              {t('pos.confirmSale')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Order summary */}
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-secondary">
              {t('pos.orderSummary')}
            </p>
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between py-1 text-sm">
                <span className="text-text">{item.product.name} × {item.quantity}</span>
                <span className="text-figures">{fmtPrice(item.product.selling_price * item.quantity)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>{t('pos.total')}</span>
              <span className="text-figures">{fmtPrice(subtotal)}</span>
            </div>
          </div>

          {/* Payment method */}
          <Select
            label={t('pos.paymentMethod')}
            options={paymentOptions}
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
          />
        </div>
      </Dialog>
    </>
  )
}
