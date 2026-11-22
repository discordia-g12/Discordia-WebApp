import { Ban, CircleUser, Phone, Pin, Search, ShieldOff, UserCheck, UserMinus, UserPlus, UserX, type LucideIcon } from 'lucide-react';
import type { DmHeaderIcon } from '@discordia/core';

/** Las claves de ícono de dmHeaderActions (core) en lucide-react: el mismo dibujo que en mobile. */
export const DM_HEADER_ICONS: Record<DmHeaderIcon, LucideIcon> = {
  phone: Phone,
  pin: Pin,
  search: Search,
  'user-plus': UserPlus,
  'user-check': UserCheck,
  'user-x': UserX,
  'user-minus': UserMinus,
  'circle-user': CircleUser,
  ban: Ban,
  'shield-off': ShieldOff,
};
