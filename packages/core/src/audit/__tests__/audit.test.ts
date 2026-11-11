import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../../api/client';
import { ApiError } from '../../api/errors';
import { getServerAuditLogs } from '../api';
import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_CATEGORY_OPTIONS,
  formatAuditAction,
  formatAuditChanges,
  formatAuditDate,
  formatAuditTarget,
} from '../formatters';
import { isAuditForbidden, auditErrorMessage } from '../useServerAuditLogs';
import { canSeeSettingsSection } from '../../admin/permissions';
import type { AuditLogPage } from '../types';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const originalFetch = globalThis.fetch;

describe('Audit API: getServerAuditLogs', () => {
  beforeEach(() => {
    configureClient({
      baseUrl: 'http://localhost:8000',
      getToken: async () => 'jwt-token',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('realiza GET al endpoint con query params correctos', async () => {
    const mockPage: AuditLogPage = {
      serverId: 'srv-123',
      items: [
        {
          id: 'log-1',
          serverId: 'srv-123',
          category: 'members',
          action: 'MEMBER_KICK',
          actorId: 'auth0|mod',
          targetId: 'auth0|user',
          reason: 'Spam',
          createdAt: '2026-11-10T12:00:00Z',
        },
      ],
      limit: 25,
      hasMore: false,
      nextCursor: null,
    };

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockPage));
    globalThis.fetch = fetchMock;

    const res = await getServerAuditLogs('srv-123', {
      category: 'members',
      action: 'MEMBER_KICK',
      actorId: 'auth0|mod',
      before: '2026-11-10T15:00:00Z',
      limit: 25,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'http://localhost:8000/api/v1/servers/srv-123/audit-logs?category=members&action=MEMBER_KICK&actor_id=auth0%7Cmod&before=2026-11-10T15%3A00%3A00Z&limit=25'
    );
    expect(init.method).toBe('GET');
    expect(init.headers['Authorization']).toBe('Bearer jwt-token');
    expect(res).toEqual(mockPage);
  });

  it('propaga ApiError 403 cuando el usuario no tiene permisos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse(
        { detail: 'Forbidden: User does not have moderation permissions for this server' },
        403
      )
    );

    await expect(getServerAuditLogs('srv-123')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('Audit Formatters', () => {
  it('traduce las categorías y opciones', () => {
    expect(AUDIT_CATEGORY_LABELS.all).toBe('Todas las acciones');
    expect(AUDIT_CATEGORY_LABELS.members).toBe('Miembros');
    expect(AUDIT_CATEGORY_LABELS.roles).toBe('Roles');
    expect(AUDIT_CATEGORY_LABELS.channels).toBe('Canales');
    expect(AUDIT_CATEGORY_LABELS.categories).toBe('Categorías');
    expect(AUDIT_CATEGORY_LABELS.server).toBe('Servidor');
    expect(AUDIT_CATEGORY_LABELS.invites).toBe('Invitaciones');
    expect(AUDIT_CATEGORY_LABELS.messages).toBe('Mensajes');

    expect(AUDIT_CATEGORY_OPTIONS).toHaveLength(8);
  });

  it('traduce acciones a texto natural en español', () => {
    expect(
      formatAuditAction({ action: 'MEMBER_KICK', category: 'members' })
    ).toBe('Expulsó a');

    expect(
      formatAuditAction({ action: 'MEMBER_BAN_ADD', category: 'members' })
    ).toBe('Baneó a');

    expect(
      formatAuditAction({ action: 'MEMBER_BAN_REMOVE', category: 'members' })
    ).toBe('Revocó el baneo de');

    expect(
      formatAuditAction({ action: 'MEMBER_MUTE', category: 'members' })
    ).toBe('Silenció a');

    expect(
      formatAuditAction({ action: 'MEMBER_UNMUTE', category: 'members' })
    ).toBe('Quitó el silencio a');

    expect(
      formatAuditAction({
        action: 'MEMBER_ROLE_ASSIGN',
        category: 'roles',
        metadata: { role_name: 'Moderador' },
      })
    ).toBe('Asignó el rol @Moderador a');

    expect(
      formatAuditAction({
        action: 'MEMBER_ROLE_REMOVE',
        category: 'roles',
        metadata: { role_name: 'Admin' },
      })
    ).toBe('Quitó el rol @Admin a');

    expect(
      formatAuditAction({
        action: 'ROLE_CREATE',
        category: 'roles',
        metadata: { name: 'VIP' },
      })
    ).toBe('Creó el rol @VIP');

    expect(
      formatAuditAction({
        action: 'CHANNEL_CREATE',
        category: 'channels',
        metadata: { name: 'general' },
      })
    ).toBe('Creó el canal #general');

    expect(
      formatAuditAction({
        action: 'CATEGORY_CREATE',
        category: 'categories',
        metadata: { name: 'Comunidad' },
      })
    ).toBe('Creó la categoría "Comunidad"');

    expect(
      formatAuditAction({ action: 'SERVER_UPDATE', category: 'server' })
    ).toBe('Actualizó los ajustes del servidor');

    expect(
      formatAuditAction({ action: 'SERVER_TRANSFER', category: 'server' })
    ).toBe('Transfirió la propiedad del servidor');

    expect(
      formatAuditAction({
        action: 'INVITE_CREATE',
        category: 'invites',
        metadata: { code: 'ABC123XYZ' },
      })
    ).toBe('Creó la invitación ABC123XYZ');

    expect(
      formatAuditAction({ action: 'MESSAGE_DELETE', category: 'messages' })
    ).toBe('Eliminó un mensaje de');
  });

  it('formatea el target sin repetir nombres ni mostrar UUIDs para roles, servidor o canales', () => {
    expect(
      formatAuditTarget({
        action: 'ROLE_PERMISSIONS_UPDATE',
        category: 'roles',
        metadata: { name: '2' },
        targetId: '0d672479-08eb-4f47-9b3e-b2e62d3b7614',
      })
    ).toBeNull();

    expect(
      formatAuditTarget({
        action: 'SERVER_UPDATE',
        category: 'server',
        metadata: {},
        targetId: 'b0c97032-e104-49e6-a4aa-1087b2657324',
        serverId: 'b0c97032-e104-49e6-a4aa-1087b2657324',
      })
    ).toBeNull();

    expect(
      formatAuditTarget({
        action: 'CHANNEL_CREATE',
        category: 'channels',
        metadata: { name: 'general' },
        targetId: 'chan-uuid-1234',
      })
    ).toBeNull();

    expect(
      formatAuditTarget(
        {
          action: 'MEMBER_KICK',
          category: 'members',
          targetId: 'usr-target',
        },
        { id: 'usr-target', displayName: 'Facundo', username: 'facu' } as any
      )
    ).toBe('@Facundo');

    expect(
      formatAuditTarget({
        action: 'MEMBER_BAN_ADD',
        category: 'members',
        metadata: { username: 'juan' },
        targetId: 'usr-target',
      })
    ).toBe('@juan');
  });

  it('formatea cambios y diferencias (antes vs después)', () => {
    const changes = {
      name: { old: 'Antiguo', new: 'Nuevo' },
      spam_filter: { old: false, new: true },
      permissions: { old: ['CONNECT'], new: ['CONNECT', 'SPEAK'] },
      icon_url: { old: 'old.png', new: null },
    };

    const diffs = formatAuditChanges(changes);
    expect(diffs).toEqual([
      { key: 'name', label: 'Nombre', oldVal: 'Antiguo', newVal: 'Nuevo' },
      { key: 'spam_filter', label: 'Filtro de spam', oldVal: 'desactivado', newVal: 'activado' },
      { key: 'permissions', label: 'Permisos', oldVal: '', newVal: '+ Hablar' },
      { key: 'icon_url', label: 'Ícono', oldVal: 'old.png', newVal: '(ninguno)' },
    ]);

    expect(formatAuditChanges(null)).toEqual([]);
    expect(formatAuditChanges(undefined)).toEqual([]);
  });

  it('formatea cambios de permisos con bitmasks y traduce a español', () => {
    // Agregar VIEW_AUDIT_LOG (bit 23)
    const addAuditLog = formatAuditChanges({
      permissions: { old: 0, new: 1 << 23 },
    });
    expect(addAuditLog).toEqual([
      {
        key: 'permissions',
        label: 'Permisos',
        oldVal: '',
        newVal: '+ Ver registro de auditoría',
      },
    ]);

    // Quitar KICK_MEMBERS (bit 4)
    const removeKick = formatAuditChanges({
      permissions: { old: 1 << 4, new: 0 },
    });
    expect(removeKick).toEqual([
      {
        key: 'permissions',
        label: 'Permisos',
        oldVal: '- Expulsar miembros',
        newVal: '',
      },
    ]);

    // Agregar y quitar en la misma acción
    const swapPerms = formatAuditChanges({
      permissions: { old: 1 << 4, new: 1 << 23 },
    });
    expect(swapPerms).toEqual([
      {
        key: 'permissions',
        label: 'Permisos',
        oldVal: '- Expulsar miembros',
        newVal: '+ Ver registro de auditoría',
      },
    ]);
  });

  it('maneja eventos legados de permisos con objeto vacío sin mostrar "- -> {}"', () => {
    const legacyEmpty = formatAuditChanges({
      permissions: {},
    });
    expect(legacyEmpty).toEqual([
      {
        key: 'permissions',
        label: 'Permisos',
        oldVal: '',
        newVal: 'permisos modificados',
      },
    ]);

    const otherEmptyObj = formatAuditChanges({
      custom_data: {},
    });
    expect(otherEmptyObj).toEqual([
      {
        key: 'custom_data',
        label: 'custom_data',
        oldVal: '-',
        newVal: '(vacío)',
      },
    ]);
  });

  it('formatea fechas relativas y absolutas', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    expect(formatAuditDate('2026-11-10T11:59:40Z', now)).toBe('hace unos momentos');
    expect(formatAuditDate('2026-11-10T11:45:00Z', now)).toBe('hace 15 min');
    expect(formatAuditDate('2026-11-10T08:00:00Z', now)).toBe('hace 4 h');
    expect(formatAuditDate('2026-11-08T12:00:00Z', now)).toContain('08/11/2026');
    expect(formatAuditDate('invalid-date')).toBe('');
  });
});

describe('Audit Helpers & Permissions', () => {
  it('detecta 403 Forbidden para auditoría', () => {
    const error403 = new ApiError({
      status: 403,
      title: 'Forbidden',
      detail: 'No tienes permisos',
    });
    const error500 = new ApiError({
      status: 500,
      title: 'Server Error',
    });

    expect(isAuditForbidden(error403)).toBe(true);
    expect(isAuditForbidden(error500)).toBe(false);
    expect(isAuditForbidden(new Error('fail'))).toBe(false);

    expect(auditErrorMessage(error403)).toContain('No tienes permisos de moderación');
    expect(auditErrorMessage(new Error('timeout'))).toBe('timeout');
  });

  it('permite ver la sección audit a moderadores o dueños', () => {
    const serverWithOwner = { ownerId: 'usr-1', myPermissions: [] };
    const serverWithMod = { ownerId: 'other', myPermissions: ['BAN_MEMBERS'] };
    const serverWithoutMod = { ownerId: 'other', myPermissions: ['SEND_MESSAGES'] };

    expect(canSeeSettingsSection(serverWithOwner, 'usr-1', 'audit')).toBe(true);
    expect(canSeeSettingsSection(serverWithMod, 'usr-2', 'audit')).toBe(true);
    expect(canSeeSettingsSection(serverWithoutMod, 'usr-3', 'audit')).toBe(false);
  });
});
