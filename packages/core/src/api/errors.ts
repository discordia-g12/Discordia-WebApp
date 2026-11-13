/**
 * Jerarquía de errores de red y API para Discordia-WebApp.
 * Diseñada para soportar RFC 7807 (Kong), formatos de FastAPI y fallos de conectividad.
 */

export class NetworkError extends Error {
  constructor(message: string = 'No se pudo establecer conexión con el servidor.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'La petición ha superado el tiempo límite de espera.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export const PROBLEM_TYPES = {
  EMAIL_NOT_VERIFIED: 'https://discordia.app/problems/email-not-verified',
  PASSWORD_RESET_THROTTLED: 'https://discordia.app/problems/password-reset-throttled',
  /** La cuenta fue suspendida por el staff de la plataforma (Kong o Auth-User, 403). */
  ACCOUNT_SUSPENDED: 'https://discordia.app/problems/account-suspended',
  /** El endpoint es solo para el staff de la plataforma (Auth-User, 403). */
  STAFF_ONLY: 'https://discordia.app/problems/staff-only',
  /** El servidor está suspendido por el staff de la plataforma (Server-Roles, 403). */
  SERVER_SUSPENDED: 'https://discordia.app/problems/server-suspended',
} as const;

/**
 * Código con el que Chat Engine y Voice Signaling cierran los WebSockets de una cuenta suspendida
 * (user.suspended). Reconectar no sirve: Kong rechaza sus tokens.
 */
export const ACCOUNT_SUSPENDED_CLOSE_CODE = 4010;

/**
 * Código con el que Chat Engine cierra los WebSockets de los canales de un servidor suspendido por el staff
 * (server.suspended). Reconectar no sirve hasta que se levante la suspensión.
 */
export const SERVER_SUSPENDED_CLOSE_CODE = 4011;

/**
 * Código con el que Chat Engine cierra los WebSockets de los canales de un servidor eliminado (server.deleted).
 * Reconectar no sirve: el servidor ya no existe.
 */
export const SERVER_DELETED_CLOSE_CODE = 4004;

export interface InvalidParam {
  name?: string;
  loc?: (string | number)[];
  msg: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly type?: string;
  /** Código de error de negocio (extensión de RFC 7807), p. ej. DM_PENDING. */
  readonly code?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly invalidParams?: InvalidParam[];
  readonly correlationId?: string;
  readonly retryAfterSeconds?: number;

  constructor(opts: {
    status: number;
    type?: string;
    code?: string;
    title?: string;
    detail?: string;
    invalidParams?: InvalidParam[];
    correlationId?: string;
    retryAfterSeconds?: number;
    message?: string;
  }) {
    super(opts.detail || opts.title || opts.message || `Error HTTP ${opts.status}`);
    this.name = 'ApiError';
    this.status = opts.status;
    this.type = opts.type;
    this.code = opts.code;
    this.title = opts.title;
    this.detail = opts.detail;
    this.invalidParams = opts.invalidParams;
    this.correlationId = opts.correlationId;
    this.retryAfterSeconds = opts.retryAfterSeconds;
  }
}

/** Retry-After en segundos. La forma de fecha HTTP no se usa en esta API y se ignora. */
function parseRetryAfter(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  return Number(value.trim());
}

/**
 * Normaliza respuestas de error HTTP tolerando tres formatos habituales:
 * 1. application/problem+json (RFC 7807 emitido por Kong)
 * 2. { "detail": "..." } (FastAPI estándar)
 * 3. { "detail": [{ "loc": [...], "msg": "..." }] } (FastAPI 422 Unprocessable Entity)
 */
export async function parseErrorResponse(
  response: Response,
  correlationId?: string
): Promise<ApiError> {
  const contentType = response.headers.get('content-type') || '';
  let type: string | undefined;
  let code: string | undefined;
  let title: string | undefined;
  let detail: string | undefined;
  let invalidParams: InvalidParam[] | undefined;

  if (contentType.includes('json')) {
    try {
      const data = await response.json();
      if (typeof data.code === 'string') code = data.code;

      // Formato 1: RFC 7807 Problem Details (Kong)
      if (data.title || data.type || data.status) {
        type = typeof data.type === 'string' ? data.type : undefined;
        title = data.title;
        detail = data.detail;
        if (Array.isArray(data.invalid_params)) {
          invalidParams = data.invalid_params;
        } else if (Array.isArray(data.errors)) {
          invalidParams = data.errors.map((e: { field?: string; name?: string; message?: string; msg?: string }) => ({
            name: e.field || e.name,
            msg: e.message || e.msg || String(e),
          }));
        }
      }

      // Formato 2 y 3: FastAPI { "detail": ... }
      if (data.detail) {
        if (typeof data.detail === 'string') {
          detail = data.detail;
        } else if (Array.isArray(data.detail)) {
          // 422 Validation Error
          invalidParams = data.detail.map((err: { loc?: (string | number)[]; msg?: string }) => ({
            name: Array.isArray(err.loc) ? String(err.loc[err.loc.length - 1]) : undefined,
            loc: err.loc,
            msg: err.msg || 'Parámetro inválido',
          }));
          detail = 'Error de validación en la solicitud enviada.';
          title = title || 'Error de Validación';
        }
      }
    } catch {
      detail = await response.text().catch(() => undefined);
    }
  } else {
    detail = await response.text().catch(() => undefined);
  }

  return new ApiError({
    status: response.status,
    type,
    code,
    title: title || `Error HTTP ${response.status}`,
    detail: detail || response.statusText,
    invalidParams,
    correlationId: correlationId || response.headers.get('x-correlation-id') || undefined,
    retryAfterSeconds: parseRetryAfter(response.headers.get('retry-after')),
  });
}

/** El `detail` de un ApiError o, si no hay, el `message` de cualquier error. */
export function errorDetail(err: unknown): string | undefined {
  if (err instanceof ApiError && err.detail) return err.detail;
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message || undefined;
  }
  return undefined;
}

/** true si `err` es un ApiError con el `type` RFC 7807 indicado. */
export function isProblemType(err: unknown, type: string): err is ApiError {
  return err instanceof ApiError && err.type === type;
}


/**
 * Mensaje para mostrarle al usuario según el código de estado de la API.
 * Los `detail` del backend vienen en inglés, así que se traducen por código.
 */
export function errorMessageFor(
  err: unknown,
  byStatus: Partial<Record<number, string>>,
  fallback: string
): string {
  if (err instanceof ApiError && byStatus[err.status]) return byStatus[err.status]!;
  return fallback;
}
