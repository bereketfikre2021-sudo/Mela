import { useCallback, useEffect, useState } from 'react'
import { getExpenses } from './api'
import { useAuth } from '../auth/AuthContext'
import type { Expense } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function useExpenses() {
  const { activeBusiness } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [status, setStatus]     = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getExpenses(activeBusiness?.id)
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setExpenses(data)
    setStatus('loaded')
  }, [activeBusiness?.id])

  useEffect(() => { void load() }, [load])

  return { expenses, status, errorMessage, reload: load }
}
