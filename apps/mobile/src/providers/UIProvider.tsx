import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { durations } from '@discordia/tokens'

interface Toast {
  /** Cada aviso tiene el suyo: uno nuevo vuelve a entrar aunque repita el texto. */
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface UIContextValue {
  selectedServerId: string | null
  selectedChannelId: string | null
  selectServer: (id: string | null) => void
  selectChannel: (id: string | null) => void

  toast: Toast | null
  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

/** Estado de la interfaz que comparten varias pantallas: servidor y canal elegidos, y el aviso en pantalla. */
export function UIProvider({ children }: { children: React.ReactNode }) {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)

  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastIdRef = useRef(0)

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = null
    }
    setToast(null)
  }, [])

  // 4 s en pantalla (durations.toast), como en la web
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ id: ++toastIdRef.current, message, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, durations.toast)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  const value = useMemo<UIContextValue>(
    () => ({
      selectedServerId,
      selectedChannelId,
      selectServer: setSelectedServerId,
      selectChannel: setSelectedChannelId,
      toast,
      showToast,
      dismissToast,
    }),
    [selectedServerId, selectedChannelId, toast, showToast, dismissToast],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI debe usarse dentro de <UIProvider>')
  return ctx
}
