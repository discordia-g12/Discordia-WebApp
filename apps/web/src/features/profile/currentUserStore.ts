import { useMemo } from 'react';
import { create } from 'zustand';
import {
  imageUploadErrorMessage,
  updateMyProfile,
  uploadMyAvatar,
  useMyStatusQuery,
  useSession,
  type UserProfile,
} from '@discordia/core';
import type { User } from '../../types';
import { showToast } from '../../app/uiStore';

function fromProfile(p: UserProfile | null): User {
  return {
    id: p?.id || p?.user_id || 'temp_id',
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
  /**
   * Guarda el perfil en el backend y, si sale bien, lo aplica. Con `avatarFile`, primero sube el avatar
   * nuevo. Resuelve true si se guardó todo.
   */
  saveProfile: (updated: User, avatarFile?: File) => Promise<boolean>;
}

/**
 * Usuario propio: el perfil de la sesión más lo que se cambia acá (el estado personalizado va con el perfil).
 * La presencia no está acá: la guarda Chat-Engine y la suma useCurrentUser (ver useMyStatusQuery).
 */
export const useCurrentUserStore = create<CurrentUserState>((set, get) => ({
  currentUser: fromProfile(useSession.getState().profile),

  syncFromProfile: (profile) =>
    set((s) => ({
      currentUser: {
        ...s.currentUser,
        ...profile,
        // El status del perfil es el activity_status de Auth, que no se usa: la presencia sale de Chat-Engine
        status: s.currentUser.status,
        id: profile.id || profile.user_id || s.currentUser.id,
        displayName: profile.displayName || profile.display_name || profile.username,
        avatar: profile.avatar || profile.avatar_url || s.currentUser.avatar,
      },
    })),

  saveProfile: async (updatedUser, avatarFile) => {
    // El avatar del formulario puede ser la vista previa local (data URL): el que vale es el guardado
    let avatar = get().currentUser.avatarUrl || get().currentUser.avatar;

    if (avatarFile) {
      try {
        const saved = await uploadMyAvatar(avatarFile);
        avatar = saved.avatar_url || saved.avatar || avatar;
        // Ya quedó guardado: se aplica aunque falle lo que sigue (la URL anterior dejó de existir)
        set((s) => ({ currentUser: { ...s.currentUser, avatar, avatarUrl: avatar } }));
      } catch (err) {
        showToast(imageUploadErrorMessage(err), 'danger');
        return false;
      }
    }

    try {
      // Sin avatar_url: el avatar solo cambia con la subida de arriba
      await updateMyProfile({
        display_name: updatedUser.displayName,
        bio: updatedUser.bio,
        custom_status: updatedUser.customStatus,
      });
    } catch {
      showToast('Error al actualizar el perfil', 'danger');
      return false;
    }

    set({ currentUser: { ...updatedUser, avatar, avatarUrl: avatar } });
    showToast('Perfil actualizado con éxito', 'success');
    return true;
  },
}));

/** Usuario propio con el estado que eligió (mientras carga, `online`). */
export function useCurrentUser(): User {
  const user = useCurrentUserStore((s) => s.currentUser);
  const { data: status } = useMyStatusQuery();
  return useMemo(() => (status ? { ...user, status } : user), [user, status]);
}
