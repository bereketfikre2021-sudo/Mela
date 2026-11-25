import { useCallback, useEffect, useState } from 'react'
import { getIncomeEntries } from './api'
import type { IncomeEntry } from './types'

type Status = 'loading' | 'loaded' | 'error'

export function useIncome() {
  const [entries,      setEntries]      = useState<IncomeEntry[]>([])
  const [status,       setStatus]       = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getIncomeEntries()
    if (error) {
      setErrorMessage(error.message)
      setStatus('error')
      return
    }
    setEntries(data ?? [])
    setStatus('loaded')
  }, [])

  useEffect(() => { void load() }, [load])

  return { entries, status, errorMessage, reload: load }
}
