import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@discordia/core';
import type { User } from '../../../types';

const { uploadMyAvatar, updateMyProfile } = vi.hoisted(() => ({
  uploadMyAvatar: vi.fn(),
  updateMyProfile: vi.fn(),
}));
vi.mock('@discordia/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@discordia/core')>()),
  uploadMyAvatar,
  updateMyProfile,
}));

import { useCurrentUserStore } from '../currentUserStore';
import { useUIStore } from '../../../app/uiStore';

const OLD = 'https://s.gravatar.com/avatar/viejo.png';
const NEW = 'https://discordia-g12-media.s3.us-east-1.amazonaws.com/avatars/nuevo.webp';
const me = { id: 'me', username: 'mar', displayName: 'Mar', status: 'online', avatar: OLD } as User;
const file = new File(['x'], 'yo.png', { type: 'image/png' });

describe('saveProfile (currentUserStore)', () => {
  beforeEach(() => {
    uploadMyAvatar.mockReset();
    updateMyProfile.mockReset().mockResolvedValue({});
    useCurrentUserStore.setState({ currentUser: me });
    useUIStore.setState({ toast: null });
  });

  it('nunca manda avatar_url: la vista previa local no llega al backend', async () => {
    const ok = await useCurrentUserStore.getState().saveProfile({ ...me, displayName: 'Mar M.', avatar: 'data:image/png;base64,AAAA' });

    expect(ok).toBe(true);
    expect(updateMyProfile).toHaveBeenCalledWith({ display_name: 'Mar M.', bio: undefined, custom_status: undefined });
    expect(uploadMyAvatar).not.toHaveBeenCalled();
    // Sigue el avatar guardado, no el data URL del formulario
    expect(useCurrentUserStore.getState().currentUser.avatar).toBe(OLD);
  });

  it('con archivo, sube el avatar y aplica la URL que devuelve la API', async () => {
    uploadMyAvatar.mockResolvedValue({ avatar_url: NEW });

    const ok = await useCurrentUserStore.getState().saveProfile({ ...me, displayName: 'Mar M.' }, file);

    expect(ok).toBe(true);
    expect(uploadMyAvatar).toHaveBeenCalledWith(file);
    expect(updateMyProfile.mock.calls[0][0]).not.toHaveProperty('avatar_url');
    const current = useCurrentUserStore.getState().currentUser;
    expect(current.avatar).toBe(NEW);
    expect(current.avatarUrl).toBe(NEW);
    expect(current.displayName).toBe('Mar M.');
  });

  it('si la subida falla, no toca el perfil y muestra por qué', async () => {
    uploadMyAvatar.mockRejectedValue(new ApiError({ status: 503 }));

    const ok = await useCurrentUserStore.getState().saveProfile({ ...me, displayName: 'Mar M.' }, file);

    expect(ok).toBe(false);
    expect(updateMyProfile).not.toHaveBeenCalled();
    expect(useCurrentUserStore.getState().currentUser).toEqual(me);
    expect(useUIStore.getState().toast?.message).toBe('No se pudo guardar la imagen. Probá de nuevo en un rato.');
  });

  it('si el avatar se subió pero el resto falla, se queda con el avatar nuevo (el viejo ya no existe)', async () => {
    uploadMyAvatar.mockResolvedValue({ avatar_url: NEW });
    updateMyProfile.mockRejectedValue(new Error('caído'));

    const ok = await useCurrentUserStore.getState().saveProfile({ ...me, displayName: 'Mar M.' }, file);

    expect(ok).toBe(false);
    const current = useCurrentUserStore.getState().currentUser;
    expect(current.avatar).toBe(NEW);
    expect(current.displayName).toBe('Mar');
  });
});

describe('syncFromProfile (currentUserStore)', () => {
  it('no toma el status del perfil: el activity_status de Auth no es la presencia', () => {
    useCurrentUserStore.setState({ currentUser: me });

    useCurrentUserStore.getState().syncFromProfile({ id: 'me', username: 'mar', displayName: 'Mar M.', status: 'offline' });

    expect(useCurrentUserStore.getState().currentUser).toMatchObject({ displayName: 'Mar M.', status: 'online' });
  });
});
