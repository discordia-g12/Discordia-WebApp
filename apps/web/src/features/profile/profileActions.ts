import { toPreferredStatus, useIsPlatformStaff, useSetMyStatusMutation } from '@discordia/core';
import type { Status, User } from '../../types';
import { showToast, useUIStore } from '../../app/uiStore';
import { authService } from '../../platform/auth/session';
import { useCurrentUser, useCurrentUserStore } from './currentUserStore';

/** Abre un perfil: el propio a pantalla completa, el de otro usuario en un modal. */
export function openUserProfile(userId: string) {
  const ui = useUIStore.getState();
  if (userId === useCurrentUserStore.getState().currentUser.id) {
    ui.setAppView('own-profile');
  } else {
    ui.setSelectedProfileUserId(userId);
    ui.setActiveModal('user-profile');
  }
}

const BACKOFFICE_URL = import.meta.env.VITE_BACKOFFICE_URL || 'http://localhost:5174';

/** Abre el backoffice en otra pestaña, sin darle acceso a esta (noopener). */
function openBackoffice() {
  window.open(BACKOFFICE_URL, '_blank', 'noopener,noreferrer');
}

/** Cerrar sesión. */
export function logoutWithToast() {
  authService.logout();
  showToast('Sesión cerrada', 'info');
}

/** Cambia el estado propio en Chat-Engine. Se ve al instante; si no se guarda, vuelve al anterior con un aviso. */
export function useChangeMyStatus() {
  const { mutate } = useSetMyStatusMutation();
  return (status: Status) =>
    mutate(toPreferredStatus(status), { onError: () => showToast('No se pudo cambiar el estado', 'danger') });
}

/**
 * Guardar desde Ajustes o Mi perfil: el perfil va a Auth-User y, si cambió, el estado a Chat-Engine.
 * Resuelve lo que resuelve saveProfile.
 */
export function useSaveOwnProfile() {
  const currentUser = useCurrentUser();
  const saveProfile = useCurrentUserStore((s) => s.saveProfile);
  const changeStatus = useChangeMyStatus();
  return (updated: User, avatarFile?: File) => {
    if (updated.status !== currentUser.status) changeStatus(updated.status);
    return saveProfile(updated, avatarFile);
  };
}

/** Acciones de la barra de usuario (abajo a la izquierda), iguales en el inicio y en un servidor. */
export function useUserPanelActions() {
  const setAppView = useUIStore((s) => s.setAppView);
  const changeStatus = useChangeMyStatus();
  const saveProfile = useCurrentUserStore((s) => s.saveProfile);
  const isStaff = useIsPlatformStaff();

  return {
    onOpenSettings: () => setAppView('user-settings'),
    // La presencia va a Chat-Engine; el estado personalizado, al perfil
    onChangeStatus: changeStatus,
    onSaveCustomStatus: (customStatus: string) =>
      saveProfile({ ...useCurrentUserStore.getState().currentUser, customStatus }),
    onEditProfile: () => setAppView('own-profile'),
    // Backoffice de la plataforma (app aparte, backoffice.discordia.lol): el link solo se muestra con el rol
    // "staff". Es solo un atajo: el backoffice vuelve a verificar el rol al entrar
    onOpenBackoffice: isStaff ? openBackoffice : undefined,
    // Estado de la plataforma e incidentes activos (historia 74, CA 3)
    onOpenPlatformStatus: () => useUIStore.getState().setActiveModal('platform-status'),
    onBuyPoints: () => setAppView('user-settings'),
    onSubscribePremium: () => setAppView('user-settings'),
    // Cerrar sesión pide confirmación
    onLogout: () => useUIStore.getState().openConfirm('logout', ''),
  };
}
