import { useCallback, useEffect, useState } from 'react'
import { getIncomeEntries } from './api'
import { useAuth } from '../auth/AuthContext'
import type { IncomeEntry } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function useIncome() {
  const { activeBusiness } = useAuth()
  const [entries,      setEntries]      = useState<IncomeEntry[]>([])
  const [status,       setStatus]       = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getIncomeEntries(activeBusiness?.id)
    if (error) {
      setErrorMessage(error.message)
      setStatus('error')
      return
    }
    setEntries(data ?? [])
    setStatus('loaded')
  }, [activeBusiness?.id])

  useEffect(() => { void load() }, [load])

  return { entries, status, errorMessage, reload: load }
}
