import { useCallback, useEffect, useState } from 'react'
import { getMovements } from './inventoryApi'
import type { InventoryMovement } from './inventoryTypes'

type Status = 'loading' | 'loaded' | 'error'

export function useMovements(filters?: {
  productId?: string
  movementType?: string
  fromTs?: string
  toTs?: string
}) {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [status, setStatus]       = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await getMovements(filters)
    if (error) { setErrorMessage(error.message); setStatus('error'); return }
    setMovements(data)
    setStatus('loaded')
  }, [filters?.productId, filters?.movementType, filters?.fromTs, filters?.toTs]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load() }, [load])

  return { movements, status, errorMessage, reload: load }
}
