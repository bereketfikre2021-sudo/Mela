import { useEffect, useState } from 'react'

/**
 * Delays updating a value until the user stops typing for `delay` ms.
 * Use this for search inputs — prevents re-rendering the full list on
 * every keystroke which can cause focus loss on mobile.
 */
export function useDebounce<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}
