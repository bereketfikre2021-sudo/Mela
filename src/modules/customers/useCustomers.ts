import { useCallback, useEffect, useState } from 'react'
import { getCustomers } from './api'
import type { Customer } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [status, setStatus]       = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getCustomers()
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setCustomers(data)
    setStatus('loaded')
  }, [])

  useEffect(() => { void load() }, [load])

  return { customers, status, errorMessage, reload: load }
}
