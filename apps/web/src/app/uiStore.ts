import { create } from 'zustand';
import type { AppView, Channel, ConfirmAction, Modal, User } from '../types';

export type ToastType = 'success' | 'danger' | 'info';

/** Cuánto queda visible un toast. */
const TOAST_MS = 3000;

interface ConfirmState {
  action: ConfirmAction;
  /** Nombre de lo que se confirma (servidor, canal de voz destino). */
  targetName: string;
  /** Dato extra (en el cambio de canal de voz, el canal actual). */
  targetDetail: string;
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
  toast: { message: string; type: ToastType } | null;

  setSelectedServerId: (id: string | 'home') => void;
  setSelectedChannelId: (id: string | null) => void;
  setSelectedDmId: (id: string | null) => void;
  setAppView: (view: AppView) => void;
  toggleMemberList: () => void;

  setActiveModal: (modal: Modal) => void;
  setSelectedProfileUserId: (id: string | null) => void;
  /** Abre la confirmación de una acción crítica. */
  openConfirm: (action: ConfirmAction, targetName: string, targetDetail?: string) => void;
  setConfirmAction: (action: ConfirmAction) => void;
  setPendingVoiceChannelId: (id: string | null) => void;
  /** Abre el modal de crear canal, con la categoría elegida. */
  openCreateChannel: (categoryId?: string) => void;
  /** Abre el modal de editar un canal. */
  openEditChannel: (channel: Channel) => void;
  setIncomingCaller: (user: User | null) => void;

  showToast: (message: string, type?: ToastType) => void;
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
  openConfirm: (action, targetName, targetDetail = '') =>
    set({ confirm: { action, targetName, targetDetail }, activeModal: 'confirm-action' }),
  setConfirmAction: (action) => set((s) => ({ confirm: { ...s.confirm, action } })),
  setPendingVoiceChannelId: (pendingVoiceChannelId) => set({ pendingVoiceChannelId }),
  openCreateChannel: (channelModalCategoryId) => set({ channelModalCategoryId, activeModal: 'create-channel' }),
  openEditChannel: (targetChannelForAction) => set({ targetChannelForAction, activeModal: 'edit-channel' }),
  setIncomingCaller: (incomingCaller) => set({ incomingCaller }),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), TOAST_MS);
  },
}));

/** Atajo para mostrar avisos desde cualquier lado (handlers async, hooks). */
export const showToast = (message: string, type?: ToastType) => useUIStore.getState().showToast(message, type);
