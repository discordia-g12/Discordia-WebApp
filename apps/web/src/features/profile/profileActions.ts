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
    // Backoffice de la plataforma: solo con el rol "staff" (sin la acción, el menú no muestra el link)
    onOpenAdmin: isStaff ? () => setAppView('admin') : undefined,
    onBuyPoints: () => setAppView('user-settings'),
    onSubscribePremium: () => setAppView('user-settings'),
    // Cerrar sesión pide confirmación
    onLogout: () => useUIStore.getState().openConfirm('logout', ''),
  };
}
