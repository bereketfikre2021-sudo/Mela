import { useCallback, useEffect, useState } from 'react'
import { getSales } from './salesApi'
import { useAuth } from '../auth/AuthContext'
import type { SaleWithItems } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function useSales() {
  const { activeBusiness } = useAuth()
  const [sales, setSales] = useState<SaleWithItems[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getSales(500, 0, activeBusiness?.id)
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setSales(data)
    setStatus('loaded')
  }, [activeBusiness?.id])

  useEffect(() => { void load() }, [load])

  return { sales, status, errorMessage, reload: load }
}
