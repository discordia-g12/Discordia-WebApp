// Constantes y tipos de ServerSettings, compartidos por sus pestañas.

export type TabType =
  | 'overview'
  | 'roles'
  | 'emojis'
  | 'boost'
  | 'channels'
  | 'moderation'
  | 'audit-log'
  | 'members'
  | 'bans'
  | 'notifications';

// Permisos agrupados y colores de rol: de core, los mismos que mobile
export { PERMISSION_CATEGORIES, PRESET_ROLE_COLORS } from '@discordia/core';
