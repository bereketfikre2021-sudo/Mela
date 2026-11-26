import { useCallback, useEffect, useState } from 'react'
import { getSuppliers } from './api'
import { useAuth } from '../auth/AuthContext'
import type { Supplier } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function useSuppliers() {
  const { activeBusiness } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [status, setStatus]       = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getSuppliers(activeBusiness?.id)
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setSuppliers(data)
    setStatus('loaded')
  }, [activeBusiness?.id])

  useEffect(() => { void load() }, [load])

  return { suppliers, status, errorMessage, reload: load }
}
