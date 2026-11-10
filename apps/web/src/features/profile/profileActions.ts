import { useIsPlatformStaff } from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { authService } from '../../platform/auth/session';
import { useCurrentUserStore } from './currentUserStore';

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

/** Acciones de la barra de usuario (abajo a la izquierda), iguales en el inicio y en un servidor. */
export function useUserPanelActions() {
  const setAppView = useUIStore((s) => s.setAppView);
  const setStatus = useCurrentUserStore((s) => s.setStatus);
  const saveProfile = useCurrentUserStore((s) => s.saveProfile);
  const isStaff = useIsPlatformStaff();

  return {
    onOpenSettings: () => setAppView('user-settings'),
    // La presencia todavía no se guarda en el backend; el estado personalizado sí (va en el perfil)
    onChangeStatus: setStatus,
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
