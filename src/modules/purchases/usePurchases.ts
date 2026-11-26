import { useCallback, useEffect, useState } from 'react'
import { getPurchases } from './api'
import { useAuth } from '../auth/AuthContext'
import type { Purchase } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function usePurchases() {
  const { activeBusiness } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [status, setStatus]       = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getPurchases(activeBusiness?.id)
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setPurchases(data)
    setStatus('loaded')
  }, [activeBusiness?.id])

  useEffect(() => { void load() }, [load])

  return { purchases, status, errorMessage, reload: load }
}
