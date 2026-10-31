import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

/** La app está en primer plano (no en segundo plano ni con la pantalla bloqueada). */
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => AppState.currentState === 'active')
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'))
    return () => subscription.remove()
  }, [])
  return active
}
