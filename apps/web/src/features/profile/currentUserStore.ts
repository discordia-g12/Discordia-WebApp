import { create } from 'zustand';
import { updateMyProfile, useSession, type UserProfile } from '@discordia/core';
import type { Status, User } from '../../types';
import { showToast } from '../../app/uiStore';

function fromProfile(p: UserProfile | null): User {
  return {
    id: p?.id || 'temp_id',
    username: p?.username || 'user',
    displayName: p?.displayName || p?.display_name || p?.username || 'User',
    avatar: p?.avatar || p?.avatar_url || '',
    status: 'online',
    customStatus: '',
    email: p?.email || '',
  };
}

interface CurrentUserState {
  currentUser: User;
  /** Mezcla el perfil que cargó la sesión (al iniciar sesión o al recargarlo). */
  syncFromProfile: (profile: UserProfile) => void;
  setStatus: (status: Status) => void;
  setCustomStatus: (customStatus: string) => void;
  /** Guarda el perfil en el backend y, si sale bien, lo aplica. */
  saveProfile: (updated: User) => void;
}

/**
 * Usuario propio tal como lo muestra la interfaz: el perfil de la sesión más lo que se cambia acá
 * (estado y estado personalizado todavía no se guardan en el backend).
 */
export const useCurrentUserStore = create<CurrentUserState>((set) => ({
  currentUser: fromProfile(useSession.getState().profile),

  syncFromProfile: (profile) =>
    set((s) => ({
      currentUser: {
        ...s.currentUser,
        ...profile,
        displayName: profile.displayName || profile.display_name || profile.username,
        avatar: profile.avatar || profile.avatar_url || s.currentUser.avatar,
      },
    })),

  setStatus: (status) => set((s) => ({ currentUser: { ...s.currentUser, status } })),
  setCustomStatus: (customStatus) => set((s) => ({ currentUser: { ...s.currentUser, customStatus } })),

  saveProfile: (updatedUser) => {
    updateMyProfile({
      display_name: updatedUser.displayName,
      avatar_url: updatedUser.avatarUrl || updatedUser.avatar,
      bio: updatedUser.bio,
      custom_status: updatedUser.customStatus,
    })
      .then(() => {
        set({ currentUser: updatedUser });
        showToast('Perfil actualizado con éxito', 'success');
      })
      .catch(() => {
        showToast('Error al actualizar el perfil', 'danger');
      });
  },
}));

export const useCurrentUser = () => useCurrentUserStore((s) => s.currentUser);
