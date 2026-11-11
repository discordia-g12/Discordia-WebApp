export type AuditCategory =
  | 'members'
  | 'roles'
  | 'channels'
  | 'categories'
  | 'server'
  | 'messages'
  | 'invites';

export type AuditAction =
  | 'MEMBER_BAN_ADD'
  | 'MEMBER_BAN_REMOVE'
  | 'MEMBER_KICK'
  | 'MEMBER_MUTE'
  | 'MEMBER_UNMUTE'
  | 'MEMBER_ROLE_ASSIGN'
  | 'MEMBER_ROLE_REMOVE'
  | 'ROLE_CREATE'
  | 'ROLE_UPDATE'
  | 'ROLE_PERMISSIONS_UPDATE'
  | 'ROLE_DELETE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_UPDATE'
  | 'CHANNEL_DELETE'
  | 'CATEGORY_CREATE'
  | 'CATEGORY_UPDATE'
  | 'CATEGORY_DELETE'
  | 'SERVER_UPDATE'
  | 'SERVER_TRANSFER'
  | 'INVITE_CREATE'
  | 'INVITE_REVOKE'
  | 'MESSAGE_DELETE';

export interface AuditChangeDiff {
  old?: unknown;
  new?: unknown;
}

export interface AuditLogEntry {
  id: string;
  eventId?: string | null;
  serverId: string;
  category: AuditCategory;
  action: AuditAction;
  actorId: string;
  targetId?: string | null;
  reason?: string | null;
  changes?: Record<string, AuditChangeDiff | unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogQuery {
  category?: AuditCategory;
  action?: AuditAction;
  actorId?: string;
  before?: string;
  limit?: number;
}

export interface AuditLogPage {
  serverId: string;
  items: AuditLogEntry[];
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}
