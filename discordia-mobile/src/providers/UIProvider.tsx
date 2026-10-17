import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Modal, ConfirmAction } from '../types'

interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

interface UIContextValue {
  selectedServerId: string | null
  selectedChannelId: string | null
  selectServer: (id: string | null) => void
  selectChannel: (id: string | null) => void

  memberListOpen: boolean
  toggleMemberList: () => void

  activeModal: Modal
  openModal: (modal: Modal) => void
  closeModal: () => void

  confirmAction: ConfirmAction
  confirmTarget?: string
  askConfirm: (action: ConfirmAction, target?: string) => void
  clearConfirm: () => void

  profileUserId: string | null
  openProfile: (userId: string) => void
  closeProfile: () => void

  // Voz — solo flags visuales, no hay audio/video real.
  inVoiceChannelId: string | null
  micMuted: boolean
  deafened: boolean
  cameraOn: boolean
  screenSharing: boolean
  joinVoice: (channelId: string) => void
  leaveVoice: () => void
  toggleMic: () => void
  toggleDeafen: () => void
  toggleCamera: () => void
  toggleScreenShare: () => void

  toast: Toast | null
  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: () => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [memberListOpen, setMemberListOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<Modal>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [confirmTarget, setConfirmTarget] = useState<string | undefined>(undefined)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  const [inVoiceChannelId, setInVoiceChannelId] = useState<string | null>(null)
  const [micMuted, setMicMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)

  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = null
    }
    setToast(null)
  }, [])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', durationMs = 2500) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast({ message, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, durationMs)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const value = useMemo<UIContextValue>(
    () => ({
      selectedServerId,
      selectedChannelId,
      selectServer: setSelectedServerId,
      selectChannel: setSelectedChannelId,

      memberListOpen,
      toggleMemberList: () => setMemberListOpen(v => !v),

      activeModal,
      openModal: setActiveModal,
      closeModal: () => setActiveModal(null),

      confirmAction,
      confirmTarget,
      askConfirm: (action, target) => {
        setConfirmAction(action)
        setConfirmTarget(target)
      },
      clearConfirm: () => {
        setConfirmAction(null)
        setConfirmTarget(undefined)
      },

      profileUserId,
      openProfile: setProfileUserId,
      closeProfile: () => setProfileUserId(null),

      inVoiceChannelId,
      micMuted,
      deafened,
      cameraOn,
      screenSharing,
      joinVoice: id => setInVoiceChannelId(id),
      leaveVoice: () => {
        setInVoiceChannelId(null)
        setCameraOn(false)
        setScreenSharing(false)
      },
      toggleMic: () => setMicMuted(v => !v),
      toggleDeafen: () => setDeafened(v => !v),
      toggleCamera: () => setCameraOn(v => !v),
      toggleScreenShare: () => setScreenSharing(v => !v),

      toast,
      showToast,
      dismissToast,
    }),
    [
      selectedServerId,
      selectedChannelId,
      memberListOpen,
      activeModal,
      confirmAction,
      confirmTarget,
      profileUserId,
      inVoiceChannelId,
      micMuted,
      deafened,
      cameraOn,
      screenSharing,
      toast,
      showToast,
      dismissToast,
    ],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI debe usarse dentro de <UIProvider>')
  return ctx
}
