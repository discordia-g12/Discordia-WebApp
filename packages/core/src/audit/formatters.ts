import type { AuditCategory, AuditLogEntry } from './types';

export const AUDIT_CATEGORY_OPTIONS: { id: AuditCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Todas las acciones' },
  { id: 'server', label: 'Servidor' },
  { id: 'channels', label: 'Canales' },
  { id: 'categories', label: 'Categorías' },
  { id: 'roles', label: 'Roles' },
  { id: 'members', label: 'Miembros' },
  { id: 'invites', label: 'Invitaciones' },
  { id: 'messages', label: 'Mensajes' },
];

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory | 'all', string> = {
  all: 'Todas las acciones',
  server: 'Servidor',
  channels: 'Canales',
  categories: 'Categorías',
  roles: 'Roles',
  members: 'Miembros',
  invites: 'Invitaciones',
  messages: 'Mensajes',
};

/**
 * Traduce la clave de acción a una descripción legible en español.
 */
export function formatAuditAction(entry: Pick<AuditLogEntry, 'action' | 'category' | 'metadata' | 'targetId'>): string {
  const meta = entry.metadata ?? {};

  switch (entry.action) {
    case 'MEMBER_BAN_ADD':
      return 'Baneó a';
    case 'MEMBER_BAN_REMOVE':
      return 'Revocó el baneo de';
    case 'MEMBER_KICK':
      return 'Expulsó a';
    case 'MEMBER_MUTE':
      return 'Silenció a';
    case 'MEMBER_UNMUTE':
      return 'Quitó el silencio a';
    case 'MEMBER_ROLE_ASSIGN':
      return meta.role_name ? `Asignó el rol @${meta.role_name} a` : 'Asignó un rol a';
    case 'MEMBER_ROLE_REMOVE':
      return meta.role_name ? `Quitó el rol @${meta.role_name} a` : 'Quitó un rol a';

    case 'ROLE_CREATE':
      return meta.name ? `Creó el rol @${meta.name}` : 'Creó un nuevo rol';
    case 'ROLE_UPDATE':
      return meta.name ? `Actualizó el rol @${meta.name}` : 'Actualizó un rol';
    case 'ROLE_PERMISSIONS_UPDATE':
      return meta.name ? `Modificó los permisos de @${meta.name}` : 'Modificó permisos de un rol';
    case 'ROLE_DELETE':
      return meta.name ? `Eliminó el rol @${meta.name}` : 'Eliminó un rol';

    case 'CHANNEL_CREATE':
      return meta.name ? `Creó el canal #${meta.name}` : 'Creó un canal';
    case 'CHANNEL_UPDATE':
      return meta.name ? `Actualizó el canal #${meta.name}` : 'Actualizó un canal';
    case 'CHANNEL_DELETE':
      return meta.name ? `Eliminó el canal #${meta.name}` : 'Eliminó un canal';

    case 'CATEGORY_CREATE':
      return meta.name ? `Creó la categoría "${meta.name}"` : 'Creó una categoría';
    case 'CATEGORY_UPDATE':
      return meta.name ? `Actualizó la categoría "${meta.name}"` : 'Actualizó una categoría';
    case 'CATEGORY_DELETE':
      return meta.name ? `Eliminó la categoría "${meta.name}"` : 'Eliminó una categoría';

    case 'SERVER_UPDATE':
      return 'Actualizó los ajustes del servidor';
    case 'SERVER_TRANSFER':
      return 'Transfirió la propiedad del servidor';

    case 'INVITE_CREATE':
      return meta.code ? `Creó la invitación ${meta.code}` : 'Creó una invitación';
    case 'INVITE_REVOKE':
      return meta.code ? `Revocó la invitación ${meta.code}` : 'Revocó una invitación';

    case 'MESSAGE_DELETE':
      return 'Eliminó un mensaje de';

    default:
      return (entry.action as string).replace(/_/g, ' ').toLowerCase();
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  description: 'Descripción',
  icon_url: 'Ícono',
  banner_url: 'Banner',
  color: 'Color',
  position: 'Posición',
  permissions: 'Permisos',
  topic: 'Tema',
  type: 'Tipo de canal',
  max_uses: 'Usos máximos',
  expires_at: 'Expira',
  explicit_filter: 'Filtro explícito',
  spam_filter: 'Filtro de spam',
  require_email: 'Exigir email',
  require_2fa: 'Exigir 2FA',
};

function formatDiffValue(val: unknown): string {
  if (val === null || val === undefined) return '(ninguno)';
  if (typeof val === 'boolean') return val ? 'activado' : 'desactivado';
  if (Array.isArray(val)) {
    if (val.length === 0) return '(vacío)';
    return val.join(', ');
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

export interface FormattedChange {
  key: string;
  label: string;
  oldVal: string;
  newVal: string;
}

/**
 * Normaliza los cambios de un registro de auditoría en una lista de diferencias (antes vs después).
 */
export function formatAuditChanges(changes?: Record<string, unknown> | null): FormattedChange[] {
  if (!changes || typeof changes !== 'object') return [];

  const result: FormattedChange[] = [];

  for (const [key, value] of Object.entries(changes)) {
    const label = FIELD_LABELS[key] || key;
    if (value && typeof value === 'object' && ('old' in value || 'new' in value)) {
      const diff = value as { old?: unknown; new?: unknown };
      result.push({
        key,
        label,
        oldVal: formatDiffValue(diff.old),
        newVal: formatDiffValue(diff.new),
      });
    } else {
      result.push({
        key,
        label,
        oldVal: '-',
        newVal: formatDiffValue(value),
      });
    }
  }

  return result;
}

const timeFormat = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Formatea la fecha ISO de un evento de auditoría en hora local argentina o tiempo relativo.
 */
export function formatAuditDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return 'hace unos momentos';
  }
  if (diffMin < 60) {
    return `hace ${diffMin} min`;
  }
  if (diffHours < 24) {
    return `hace ${diffHours} h`;
  }

  return timeFormat.format(date);
}
