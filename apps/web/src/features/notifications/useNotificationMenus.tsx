import { useCallback, useState } from 'react';
import { useNotificationPreference, type NotificationPreferenceTarget } from '@discordia/core';
import { NotificationLevelMenu, type NotificationLevelMenuProps } from './NotificationLevelMenu';

/**
 * El menú de avisos de una lista (servidores, canales, DMs): `open(target, name)` da el handler que recibe la
 * posición (para `useContextMenuTrigger`) y `menu` es lo que hay que renderizar.
 */
export function useNotificationLevelMenu() {
  const [state, setState] = useState<Omit<NotificationLevelMenuProps, 'onClose'> | null>(null);
  const close = useCallback(() => setState(null), []);
  return {
    open: (target: NotificationPreferenceTarget, name: string) => (x: number, y: number) => setState({ target, name, x, y }),
    menu: state && <NotificationLevelMenu {...state} onClose={close} />,
  };
}

/**
 * La campana del encabezado de un canal o DM (`dm-…`, con `serverId` null): abre el menú de nivel (Todos / Solo
 * menciones / Nada / Heredar), como la campana de mobile. `off` la muestra tachada: silenciado o en "Nada".
 * Sin canal devuelve undefined y no hay campana.
 */
export function useChannelNotifications(serverId: string | null, channelId: string | null | undefined) {
  // Los hooks van siempre (reglas de hooks); sin canal no se usa lo que devuelven
  const pref = useNotificationPreference({ scopeType: 'channel', serverId, channelId: channelId ?? '' });
  const levelMenu = useNotificationLevelMenu();
  if (!channelId) return undefined;
  return {
    off: pref.effective.muted || pref.effective.level === 'none',
    onOpen: (name: string, x: number, y: number) => levelMenu.open({ scopeType: 'channel', serverId, channelId }, name)(x, y),
    menu: levelMenu.menu,
  };
}
