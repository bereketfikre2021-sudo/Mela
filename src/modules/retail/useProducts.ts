/**
 * React hook: load the authenticated owner's product list.
 * Serves cached data when offline; updates cache on successful fetch.
 */
import { useCallback, useEffect, useState } from 'react'
import { getProducts } from './api'
import { cacheGet, cacheSet } from '../../lib/db'
import type { Product } from './types'

const CACHE_KEY = 'products_list'
type Status = 'loading' | 'loaded' | 'error'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus]     = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')

    // Try Supabase first
    if (navigator.onLine) {
      const { data, error } = await getProducts()
      if (!error && data) {
        setProducts(data)
        setStatus('loaded')
        // Update cache in background
        void cacheSet(CACHE_KEY, data)
        return
      }
    }

    // Offline or failed — serve cache
    const cached = await cacheGet<Product[]>(CACHE_KEY)
    if (cached && cached.length > 0) {
      setProducts(cached)
      setStatus('loaded')
      return
    }

    // Nothing available
    if (!navigator.onLine) {
      setProducts([])
      setStatus('loaded') // empty but not error — graceful offline
      return
    }

    // Real error while online
    const { data, error } = await getProducts()
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setProducts(data)
    setStatus('loaded')
  }, [])

  useEffect(() => { void load() }, [load])

  return { products, status, errorMessage, reload: load }
}
