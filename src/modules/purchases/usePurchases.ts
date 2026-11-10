import { useCallback, useEffect, useState } from 'react'
import { getPurchases } from './api'
import type { Purchase } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [status, setStatus]       = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getPurchases()
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setPurchases(data)
    setStatus('loaded')
  }, [])

  useEffect(() => { void load() }, [load])

  return { purchases, status, errorMessage, reload: load }
}
