import { useCallback, useEffect, useState } from 'react'
import { getExpenses } from './api'
import type { Expense } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [status, setStatus]     = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getExpenses()
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setExpenses(data)
    setStatus('loaded')
  }, [])

  useEffect(() => { void load() }, [load])

  return { expenses, status, errorMessage, reload: load }
}
