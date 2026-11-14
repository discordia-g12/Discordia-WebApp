import type { DmActions } from './actions';

/**
 * Ícono de una acción del encabezado del chat. Cada plataforma lo traduce a su componente de lucide
 * (`lucide-react` en la web, `lucide-react-native` en mobile): así las dos muestran el mismo dibujo.
 */
export type DmHeaderIcon =
  | 'phone'
  | 'pin'
  | 'user-plus'
  | 'user-check'
  | 'user-x'
  | 'user-minus'
  | 'circle-user'
  | 'ban'
  | 'shield-off';

export type DmHeaderActionId =
  | 'call'
  | 'pins'
  | 'add-friend'
  | 'accept-friend'
  | 'cancel-friend-request'
  | 'profile'
  | 'unblock'
  | 'decline-friend'
  | 'remove-friend'
  | 'block';

export interface DmHeaderAction {
  id: DmHeaderActionId;
  icon: DmHeaderIcon;
  /** Nombre accesible y tooltip; también es el texto del ítem en el menú "más". */
  label: string;
  /** Destructiva (eliminar amigo, bloquear): la interfaz la marca y pide confirmación. */
  destructive?: boolean;
  /** Mensajes fijados: el panel está abierto. */
  pressed?: boolean;
  /** Cantidad a mostrar sobre el ícono (mensajes fijados). */
  badge?: number;
  /** Visible pero sin acción (solicitud enviada mientras se procesa). */
  disabled?: boolean;
}

export interface DmHeaderLayout {
  /** Íconos del encabezado, en orden. */
  icons: DmHeaderAction[];
  /** Lo que va en el menú "más" (vacío: no se muestra el botón). */
  menu: DmHeaderAction[];
}

export interface DmHeaderInput {
  /** Nombre de la otra persona, para los nombres accesibles ("Llamar a Ana"). */
  name: string;
  actions: DmActions;
  /** Ya existe la conversación (sin ella no hay llamada ni mensajes fijados). */
  hasConversation: boolean;
  /** Hay una llamada en curso en este chat: el panel de la llamada tiene cortar, no se ofrece llamar. */
  inCallHere?: boolean;
  /** Mensajes fijados. `undefined`: la plataforma no tiene ese panel en el DM. */
  pinned?: { count: number; open: boolean };
  /** Se ofrece abrir el perfil con un ícono. En mobile se abre tocando el nombre: false. */
  showProfile?: boolean;
  /** Se acaba de mandar la solicitud de amistad y todavía no volvió la relación nueva. */
  friendRequestSending?: boolean;
  /**
   * Cuántos íconos entran. El resto pasa al menú "más", en el mismo orden. Sin límite en la web de escritorio;
   * 3 en pantallas angostas (web responsive y mobile), para que el nombre no se corte.
   */
  maxIcons?: number;
}

/** Íconos que entran en pantallas angostas, además del botón "más". */
export const DM_HEADER_COMPACT_ICONS = 3;

/**
 * Qué acciones muestra el encabezado de un chat directo y cómo, igual en web y mobile. Las frecuentes van como
 * íconos, en este orden: llamar, mensajes fijados, la acción de amistad que corresponda, perfil y desbloquear.
 * Las raras o destructivas (rechazar amistad, eliminar amigo, bloquear) van siempre en el menú "más".
 */
export function dmHeaderActions(input: DmHeaderInput): DmHeaderLayout {
  const { name, actions, hasConversation, inCallHere = false, pinned, showProfile = true } = input;
  const primary: DmHeaderAction[] = [];
  const secondary: DmHeaderAction[] = [];

  if (actions.canCall && hasConversation && !inCallHere) {
    primary.push({ id: 'call', icon: 'phone', label: `Llamar a ${name}` });
  }
  if (pinned && hasConversation) {
    primary.push({
      id: 'pins',
      icon: 'pin',
      label: 'Mensajes fijados',
      pressed: pinned.open,
      ...(pinned.count > 0 ? { badge: pinned.count } : {}),
    });
  }

  if (actions.canAddFriend) {
    primary.push(
      input.friendRequestSending
        ? { id: 'add-friend', icon: 'user-check', label: 'Solicitud de amistad enviada', disabled: true }
        : { id: 'add-friend', icon: 'user-plus', label: `Agregar a ${name} como amigo` }
    );
  }
  if (actions.canRespondFriendRequest) {
    primary.push({ id: 'accept-friend', icon: 'user-check', label: 'Aceptar solicitud de amistad' });
    secondary.push({ id: 'decline-friend', icon: 'user-x', label: 'Rechazar solicitud de amistad' });
  }
  if (actions.canCancelFriendRequest) {
    primary.push({ id: 'cancel-friend-request', icon: 'user-x', label: 'Cancelar solicitud de amistad' });
  }

  if (showProfile) primary.push({ id: 'profile', icon: 'circle-user', label: `Ver el perfil de ${name}` });
  // Bloqueado: desbloquear es lo único que destraba el chat, así que va a la vista
  if (actions.canUnblock) primary.push({ id: 'unblock', icon: 'shield-off', label: `Desbloquear a ${name}` });

  if (actions.canRemoveFriend) {
    secondary.push({ id: 'remove-friend', icon: 'user-minus', label: 'Eliminar amigo', destructive: true });
  }
  if (actions.canBlock) secondary.push({ id: 'block', icon: 'ban', label: `Bloquear a ${name}`, destructive: true });

  const max = input.maxIcons ?? Infinity;
  return { icons: primary.slice(0, max), menu: [...primary.slice(max), ...secondary] };
}
