import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureClient } from '../../api/client';
import { ApiError, NetworkError } from '../../api/errors';
import {
  createIncident,
  incidentErrorMessage,
  incidentSuggestions,
  listIncidents,
  resolveIncident,
  suggestedIncidentTitle,
} from '../incidents';
import { getPublicPlatformStatus, platformHealthLabel, platformServiceName, type PlatformStatus } from '../platformStatus';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const STATUS: PlatformStatus = {
  status: 'degraded',
  checkedAt: '2026-11-10T12:00:00Z',
  services: [
    { id: 'chat', name: 'Chat', status: 'degraded', httpStatus: 503, latencyMs: 5, checkedAt: null, since: '2026-11-10T11:58:00Z', error: 'http_5xx' },
    { id: 'voice', name: 'Voz', status: 'degraded', httpStatus: null, latencyMs: null, checkedAt: null, since: '2026-11-10T11:59:00Z', error: 'timeout' },
    { id: 'auth', name: 'Auth y usuarios', status: 'operational', httpStatus: 200, latencyMs: 5, checkedAt: null, since: null, error: null },
  ],
};

describe('sugerencias de incidente (plus de la historia 74)', () => {
  it('sugiere cada servicio degradado que ningún incidente activo cubre', () => {
    const suggestions = incidentSuggestions(STATUS, [{ affectedServices: ['voice'] }]);
    expect(suggestions).toEqual([
      { serviceId: 'chat', serviceName: 'Chat', since: '2026-11-10T11:58:00Z', key: 'chat@2026-11-10T11:58:00Z' },
    ]);
  });

  it('sin datos todavía, o todo cubierto, no sugiere nada', () => {
    expect(incidentSuggestions(undefined, [])).toEqual([]);
    expect(incidentSuggestions(STATUS, undefined)).toEqual([]);
    expect(incidentSuggestions(STATUS, [{ affectedServices: ['chat', 'voice'] }])).toEqual([]);
  });

  it('una sugerencia descartada no vuelve, salvo que el servicio caiga de nuevo (otro since)', () => {
    const dismissed = new Set(['chat@2026-11-10T11:58:00Z']);
    expect(incidentSuggestions(STATUS, [], dismissed).map((s) => s.serviceId)).toEqual(['voice']);
    const again = { ...STATUS, services: [{ ...STATUS.services[0], since: '2026-11-10T12:30:00Z' }] };
    expect(incidentSuggestions(again, [], dismissed).map((s) => s.serviceId)).toEqual(['chat']);
  });

  it('propone un título dentro del límite', () => {
    expect(suggestedIncidentTitle('Chat')).toBe('Problemas en Chat');
    expect(suggestedIncidentTitle('x'.repeat(200))).toHaveLength(120);
  });
});

describe('mensajes de error de incidentes', () => {
  it('cubre sesión, permisos, red y cada respuesta del backend', () => {
    expect(incidentErrorMessage(new ApiError({ status: 401 }), 'create')).toMatch(/sesión venció/);
    expect(incidentErrorMessage(new ApiError({ status: 403 }), 'resolve')).toMatch(/permisos de staff/);
    expect(incidentErrorMessage(new NetworkError(), 'create')).toMatch(/conectar/);
    expect(incidentErrorMessage(new ApiError({ status: 400 }), 'create')).toMatch(/Revisá los campos/);
    expect(incidentErrorMessage(new ApiError({ status: 400 }), 'resolve')).toMatch(/nota de cierre/);
    expect(incidentErrorMessage(new ApiError({ status: 404 }), 'resolve')).toBe('Ese incidente ya no existe.');
    expect(incidentErrorMessage(new ApiError({ status: 409 }), 'resolve')).toBe('Ese incidente ya estaba resuelto.');
    expect(incidentErrorMessage(new ApiError({ status: 500 }), 'list')).toBe('No pudimos traer los incidentes.');
    expect(incidentErrorMessage(new ApiError({ status: 500 }), 'create')).toBe('No se pudo publicar el incidente.');
    expect(incidentErrorMessage(new Error('x'), 'resolve')).toBe('No se pudo resolver el incidente.');
  });
});

describe('API de incidentes', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token', onAuthFailure: () => {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('publicar manda los campos recortados a /api/v1/admin/incidents', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'i1' }, 201));
    await createIncident({ title: '  Caída  ', description: ' algo \n', kind: 'maintenance', affectedServices: ['chat'] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://api.test/api/v1/admin/incidents');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      title: 'Caída',
      description: 'algo',
      kind: 'maintenance',
      affectedServices: ['chat'],
    });
  });

  it('resolver manda la nota solo si tiene texto', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ id: 'i1' }));
    await resolveIncident({ id: 'i1', note: '  listo ' });
    await resolveIncident({ id: 'i1', note: '   ' });
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)));
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://api.test/api/v1/admin/incidents/i1/resolve');
    expect(bodies).toEqual([{ note: 'listo' }, {}]);
  });

  it('listar pasa estado y límite como query', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], nextBefore: null }));
    await listIncidents({ status: 'active', limit: 100 });
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://api.test/api/v1/admin/incidents?status=active&limit=100');
  });

  it('el estado público sin campo incidents (backend anterior) queda sin incidentes', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'operational', checkedAt: null, services: [] }));
    expect((await getPublicPlatformStatus()).incidents).toEqual([]);
    fetchMock.mockResolvedValue(jsonResponse({}));
    expect(await getPublicPlatformStatus()).toEqual({ status: 'unknown', checkedAt: null, services: [], incidents: [] });
  });
});

describe('etiquetas', () => {
  it('mantenimiento y nombres de servicio', () => {
    expect(platformHealthLabel('maintenance')).toBe('En mantenimiento');
    expect(platformServiceName('server-roles')).toBe('Servidores y roles');
    expect(platformServiceName('otro')).toBe('otro');
  });
});
