import { create } from 'zustand';
import { durations } from '@discordia/tokens';
import type { AppView, Channel, ConfirmAction, Modal } from '../types';

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

/**
 * Qué está abierto en el inicio: el chat con un usuario (exista o no la conversación todavía) o la tarjeta
 * de una solicitud de amistad recibida.
 */
export type DmTarget = { type: 'chat'; userId: string } | { type: 'friend-request'; requestId: string };

/** Hilo abierto en el panel derecho: de qué canal o DM (`dm-…`) y cuál es el mensaje original. */
export interface OpenThread {
  channelId: string;
  messageId: string;
  /** null en un DM: se guarda con la preferencia, para limpiarla si se borra el servidor. */
  serverId: string | null;
}

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
  selectedDm: DmTarget | null;
  appView: AppView;
  isMemberListOpen: boolean;
  /**
   * Lista de miembros en el escritorio compacto (useIsCompact), donde se abre encima del chat: arranca
   * cerrada y cambiar de canal o de servidor la cierra. En pantalla grande manda isMemberListOpen.
   */
  isMemberOverlayOpen: boolean;
  /** Hilo abierto (reemplaza a la lista de miembros). Cambiar de canal, servidor o DM lo cierra. */
  openThread: OpenThread | null;
  /** Canal de texto o conversación en pantalla (el chat montado): no suma no leídos y se marca al leerlo. */
  readingChannelId: string | null;

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

  // ── Avisos ──
  toast: ToastState | null;

  setSelectedServerId: (id: string | 'home') => void;
  setSelectedChannelId: (id: string | null) => void;
  setSelectedDm: (target: DmTarget | null) => void;
  setAppView: (view: AppView) => void;
  /** `overlay`: en el escritorio compacto cambia isMemberOverlayOpen en vez de isMemberListOpen. */
  toggleMemberList: (overlay?: boolean) => void;
  closeMemberOverlay: () => void;
  setOpenThread: (thread: OpenThread | null) => void;
  setReadingChannelId: (id: string | null) => void;

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
  selectedDm: null,
  appView: 'chat',
  isMemberListOpen: true,
  isMemberOverlayOpen: false,
  openThread: null,
  readingChannelId: null,

  activeModal: null,
  selectedProfileUserId: null,
  confirm: { action: null, targetName: '', targetDetail: '' },
  pendingVoiceChannelId: null,
  channelModalCategoryId: undefined,
  targetChannelForAction: null,

  toast: null,

  // El hilo es de lo que se estaba mirando: cambiar de lugar lo cierra (salvo que sea el mismo canal).
  // La lista de miembros encima del chat (escritorio compacto) se cierra al cambiar de lugar.
  setSelectedServerId: (selectedServerId) =>
    set((s) =>
      s.selectedServerId === selectedServerId
        ? { selectedServerId }
        : { selectedServerId, openThread: null, isMemberOverlayOpen: false }
    ),
  setSelectedChannelId: (selectedChannelId) =>
    set((s) => ({
      selectedChannelId,
      openThread: s.openThread?.channelId === selectedChannelId ? s.openThread : null,
      isMemberOverlayOpen: s.selectedChannelId === selectedChannelId ? s.isMemberOverlayOpen : false,
    })),
  setSelectedDm: (selectedDm) => set({ selectedDm, openThread: null }),
  setAppView: (appView) => set({ appView }),
  // Abrir la lista de miembros cierra el hilo: comparten el panel
  toggleMemberList: (overlay = false) =>
    set((s) => {
      if (overlay) return s.openThread ? { openThread: null, isMemberOverlayOpen: true } : { isMemberOverlayOpen: !s.isMemberOverlayOpen };
      return s.openThread ? { openThread: null, isMemberListOpen: true } : { isMemberListOpen: !s.isMemberListOpen };
    }),
  closeMemberOverlay: () => set({ isMemberOverlayOpen: false }),
  setOpenThread: (openThread) => set({ openThread }),
  setReadingChannelId: (readingChannelId) => set({ readingChannelId }),

  setActiveModal: (activeModal) => set({ activeModal }),
  setSelectedProfileUserId: (selectedProfileUserId) => set({ selectedProfileUserId }),
  openConfirm: (action, targetName, targetDetail = '', onConfirm) =>
    set({ confirm: { action, targetName, targetDetail, onConfirm }, activeModal: 'confirm-action' }),
  setConfirmAction: (action) => set((s) => ({ confirm: { ...s.confirm, action, onConfirm: action ? s.confirm.onConfirm : undefined } })),
  setPendingVoiceChannelId: (pendingVoiceChannelId) => set({ pendingVoiceChannelId }),
  openCreateChannel: (channelModalCategoryId) => set({ channelModalCategoryId, activeModal: 'create-channel' }),
  openEditChannel: (targetChannelForAction) => set({ targetChannelForAction, activeModal: 'edit-channel' }),

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
