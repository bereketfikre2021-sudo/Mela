/**
 * React hook: load the authenticated owner's product list.
 * Returns loading / error / data states matching the design-system pattern.
 */
import { useCallback, useEffect, useState } from 'react'
import { getProducts } from './api'
import type { Product } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getProducts()
    if (error) {
      setErrorMessage(error.message)
      setStatus('error')
      return
    }
    setProducts(data)
    setStatus('loaded')
  }, [])

  useEffect(() => { void load() }, [load])

  return { products, status, errorMessage, reload: load }
}
