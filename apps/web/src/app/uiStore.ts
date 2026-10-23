import { create } from 'zustand';
import { durations } from '@discordia/tokens';
import type { AppView, Channel, ConfirmAction, Modal, User } from '../types';

export type ToastType = 'success' | 'danger' | 'info';

/** Acción dentro del aviso ("_reintentar"). */
export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastState {
  /** Cada aviso tiene su id: el timer de uno anterior no cierra al que lo reemplazó. */
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

/** Cuánto queda visible un aviso; con una acción, el doble, para que dé tiempo a usarla. */
const TOAST_MS = durations.toast;

let lastToastId = 0;

interface ConfirmState {
  action: ConfirmAction;
  /** Nombre de lo que se confirma (servidor, canal de voz destino). */
  targetName: string;
  /** Dato extra (en el cambio de canal de voz, el canal actual). */
  targetDetail: string;
  /** Qué hacer al confirmar, si no lo resuelve GlobalModals (borrar un canal desde los ajustes, ...). */
  onConfirm?: () => void | Promise<void>;
}

export interface UIState {
  // ── Navegación ──
  selectedServerId: string | 'home';
  selectedChannelId: string | null;
  selectedDmId: string | null;
  appView: AppView;
  isMemberListOpen: boolean;

  // ── Modales ──
  activeModal: Modal;
  selectedProfileUserId: string | null;
  confirm: ConfirmState;
  /** Canal de voz al que se pidió cambiar, a la espera de confirmación. */
  pendingVoiceChannelId: string | null;
  /** Categoría preseleccionada al crear un canal. */
  channelModalCategoryId: string | undefined;
  /** Canal que se está editando. */
  targetChannelForAction: Channel | null;
  /** Llamada entrante simulada (todavía no hay llamadas directas en el backend). */
  incomingCaller: User | null;

  // ── Avisos ──
  toast: ToastState | null;

  setSelectedServerId: (id: string | 'home') => void;
  setSelectedChannelId: (id: string | null) => void;
  setSelectedDmId: (id: string | null) => void;
  setAppView: (view: AppView) => void;
  toggleMemberList: () => void;

  setActiveModal: (modal: Modal) => void;
  setSelectedProfileUserId: (id: string | null) => void;
  /** Abre la confirmación de una acción crítica. */
  openConfirm: (
    action: ConfirmAction,
    targetName: string,
    targetDetail?: string,
    onConfirm?: () => void | Promise<void>
  ) => void;
  setConfirmAction: (action: ConfirmAction) => void;
  setPendingVoiceChannelId: (id: string | null) => void;
  /** Abre el modal de crear canal, con la categoría elegida. */
  openCreateChannel: (categoryId?: string) => void;
  /** Abre el modal de editar un canal. */
  openEditChannel: (channel: Channel) => void;
  setIncomingCaller: (user: User | null) => void;

  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
  dismissToast: () => void;
}

/**
 * Estado de la interfaz web: qué se está mirando y qué modal está abierto. Los datos del servidor
 * van por React Query (@discordia/core); acá solo lo que es de la pantalla.
 */
export const useUIStore = create<UIState>((set) => ({
  selectedServerId: 'home',
  selectedChannelId: null,
  selectedDmId: null,
  appView: 'chat',
  isMemberListOpen: true,

  activeModal: null,
  selectedProfileUserId: null,
  confirm: { action: null, targetName: '', targetDetail: '' },
  pendingVoiceChannelId: null,
  channelModalCategoryId: undefined,
  targetChannelForAction: null,
  incomingCaller: null,

  toast: null,

  setSelectedServerId: (selectedServerId) => set({ selectedServerId }),
  setSelectedChannelId: (selectedChannelId) => set({ selectedChannelId }),
  setSelectedDmId: (selectedDmId) => set({ selectedDmId }),
  setAppView: (appView) => set({ appView }),
  toggleMemberList: () => set((s) => ({ isMemberListOpen: !s.isMemberListOpen })),

  setActiveModal: (activeModal) => set({ activeModal }),
  setSelectedProfileUserId: (selectedProfileUserId) => set({ selectedProfileUserId }),
  openConfirm: (action, targetName, targetDetail = '', onConfirm) =>
    set({ confirm: { action, targetName, targetDetail, onConfirm }, activeModal: 'confirm-action' }),
  setConfirmAction: (action) => set((s) => ({ confirm: { ...s.confirm, action, onConfirm: action ? s.confirm.onConfirm : undefined } })),
  setPendingVoiceChannelId: (pendingVoiceChannelId) => set({ pendingVoiceChannelId }),
  openCreateChannel: (channelModalCategoryId) => set({ channelModalCategoryId, activeModal: 'create-channel' }),
  openEditChannel: (targetChannelForAction) => set({ targetChannelForAction, activeModal: 'edit-channel' }),
  setIncomingCaller: (incomingCaller) => set({ incomingCaller }),

  showToast: (message, type = 'info', action) => {
    const id = ++lastToastId;
    set({ toast: { id, message, type, action } });
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), action ? TOAST_MS * 2 : TOAST_MS);
  },
  dismissToast: () => set({ toast: null }),
}));

/** Atajo para mostrar avisos desde cualquier lado (handlers async, hooks). */
export const showToast = (message: string, type?: ToastType, action?: ToastAction) =>
  useUIStore.getState().showToast(message, type, action);
