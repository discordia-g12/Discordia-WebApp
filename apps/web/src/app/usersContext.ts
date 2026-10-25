import { createContext, useContext } from 'react';
import type { User } from '../types';

export interface UsersContextValue {
  /** Usuarios conocidos por id: perfiles cargados, miembros sin perfil todavía y el propio. */
  usersMap: Record<string, User>;
  /** El usuario, o uno provisorio si todavía no llegó su perfil. */
  userOrFallback: (id: string) => User;
}

export const UsersContext = createContext<UsersContextValue | null>(null);

export function useUsers(): UsersContextValue {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers debe usarse dentro de <UsersProvider>');
  return ctx;
}
