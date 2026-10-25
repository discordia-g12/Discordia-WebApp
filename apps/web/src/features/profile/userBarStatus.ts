import type { Status, User } from '../../types';

const STATUS_LABEL: Record<Status, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  invisible: 'Invisible',
  offline: 'Invisible',
};

/**
 * Estado bajo el nombre, con barra final: "reconectando/" mientras vuelve la conexión, "En canal de voz/",
 * el estado personalizado o la presencia ("Invisible/").
 */
export function userBarStatus(user: Pick<User, 'status' | 'customStatus'>, inVoiceChannel: boolean, reconnecting = false): string {
  if (reconnecting) return 'reconectando/';
  if (inVoiceChannel) return 'En canal de voz/';
  return `${user.customStatus || STATUS_LABEL[user.status] || STATUS_LABEL.offline}/`;
}
