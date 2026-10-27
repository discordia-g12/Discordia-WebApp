import { useCallback } from 'react';
import { canInServer } from '@discordia/core';
import { useCurrentUser } from '../profile/currentUserStore';
import { useCurrentServer } from './useCurrentServer';

/**
 * Si el usuario puede hacer algo en el servidor seleccionado (id de PERMISSION_BITS). Sirve para
 * mostrar u ocultar acciones; el backend vuelve a chequear cada una.
 */
export function useCanInCurrentServer(): (permission: string) => boolean {
  const { currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  return useCallback(
    (permission: string) => canInServer(currentServer, currentUser.id, permission),
    [currentServer, currentUser.id]
  );
}
