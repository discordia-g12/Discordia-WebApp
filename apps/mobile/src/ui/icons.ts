import {
  Ban,
  CircleUser,
  Phone,
  Pin,
  ShieldOff,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  type LucideIcon,
} from 'lucide-react-native'
import type { DmHeaderIcon } from '@discordia/core'

/**
 * Las claves de ícono de core (dmHeaderActions) en componentes de lucide-react-native. Es el único lugar
 * donde se traducen: la web tiene el mismo mapa con lucide-react, así las dos muestran el mismo dibujo.
 */
export const ACTION_ICONS: Record<DmHeaderIcon, LucideIcon> = {
  phone: Phone,
  pin: Pin,
  'user-plus': UserPlus,
  'user-check': UserCheck,
  'user-x': UserX,
  'user-minus': UserMinus,
  'circle-user': CircleUser,
  ban: Ban,
  'shield-off': ShieldOff,
}
