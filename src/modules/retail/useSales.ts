import { useCallback, useEffect, useState } from 'react'
import { getSales } from './salesApi'
import type { SaleWithItems } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function useSales() {
  const [sales, setSales] = useState<SaleWithItems[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getSales()
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setSales(data)
    setStatus('loaded')
  }, [])

  useEffect(() => { void load() }, [load])

  return { sales, status, errorMessage, reload: load }
}
