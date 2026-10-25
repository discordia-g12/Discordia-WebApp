import { PERMISSION_BITS } from '../api/roles';

/**
 * Permisos de un rol tal como se muestran en los ajustes del servidor (web y mobile), agrupados. Los ids
 * son los de PERMISSION_BITS; los que todavía no tienen bit en el backend (VIEW_AUDIT_LOG, STREAM) se
 * muestran sin poder activarse (hasBackendBit).
 */
export const PERMISSION_CATEGORIES = [
  {
    category: 'Permisos generales',
    permissions: [
      { id: 'ADMINISTRATOR', name: 'Administrador', desc: 'Tiene todos los permisos e ignora los de cada canal.' },
      { id: 'MANAGE_SERVER', name: 'Gestionar servidor', desc: 'Cambiar el nombre, el ícono y la dirección del servidor.' },
      { id: 'MANAGE_ROLES', name: 'Gestionar roles', desc: 'Crear, editar y borrar roles por debajo de este.' },
      { id: 'MANAGE_CHANNELS', name: 'Gestionar canales', desc: 'Crear, ordenar y borrar canales del servidor.' },
      { id: 'VIEW_AUDIT_LOG', name: 'Ver registro de auditoría', desc: 'Ver las acciones de administración del servidor.' },
    ],
  },
  {
    category: 'Permisos de miembros',
    permissions: [
      { id: 'CREATE_INSTANT_INVITE', name: 'Crear invitaciones', desc: 'Crear enlaces de invitación permanentes y temporales.' },
      { id: 'KICK_MEMBERS', name: 'Expulsar miembros', desc: 'Sacar miembros del servidor, con un motivo opcional.' },
      { id: 'BAN_MEMBERS', name: 'Banear miembros', desc: 'Banear cuentas y borrar sus mensajes recientes.' },
      { id: 'CHANGE_NICKNAME', name: 'Cambiar apodo', desc: 'Que cada miembro elija su apodo en el servidor.' },
    ],
  },
  {
    category: 'Permisos de texto',
    permissions: [
      { id: 'SEND_MESSAGES', name: 'Enviar mensajes', desc: 'Escribir en los canales de texto.' },
      { id: 'ATTACH_FILES', name: 'Adjuntar archivos', desc: 'Subir imágenes, videos, audios y documentos.' },
      { id: 'ADD_REACTIONS', name: 'Reaccionar', desc: 'Agregar reacciones nuevas a los mensajes.' },
      { id: 'MENTION_EVERYONE', name: 'Mencionar @everyone', desc: 'Avisar a todos con @everyone y @here.' },
      { id: 'MANAGE_MESSAGES', name: 'Gestionar mensajes', desc: 'Borrar y fijar mensajes de otros miembros.' },
    ],
  },
  {
    category: 'Permisos de voz',
    permissions: [
      { id: 'CONNECT', name: 'Conectarse', desc: 'Entrar a los canales de voz y escuchar.' },
      { id: 'SPEAK', name: 'Hablar', desc: 'Transmitir el micrófono en los canales de voz.' },
      { id: 'STREAM', name: 'Video y pantalla', desc: 'Compartir la cámara o la pantalla.' },
      { id: 'MUTE_MEMBERS', name: 'Silenciar miembros', desc: 'Silenciar a otros en los canales de voz.' },
      { id: 'DEAFEN_MEMBERS', name: 'Ensordecer miembros', desc: 'Quitarles el audio a otros en los canales de voz.' },
      { id: 'MOVE_MEMBERS', name: 'Mover miembros', desc: 'Pasar gente de un canal de voz a otro.' },
    ],
  },
];

/** El permiso se puede guardar: tiene bit en el bitmask del backend. */
export const hasBackendBit = (permissionId: string) => PERMISSION_BITS[permissionId] !== undefined;

/** Colores que se ofrecen al crear o editar un rol (se guardan en el backend). */
export const PRESET_ROLE_COLORS = [
  '#99aab5', // Default
  '#5865f2', // Blurple
  '#23a55a', // Green
  '#f0b232', // Amber
  '#eb459e', // Fuchsia
  '#da373c', // Red
  '#00a8fc', // Cyan
  '#9b59b6', // Violet
];
