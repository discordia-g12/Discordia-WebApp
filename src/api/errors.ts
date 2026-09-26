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
} as const;

export interface InvalidParam {
  name?: string;
  loc?: (string | number)[];
  msg: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly type?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly invalidParams?: InvalidParam[];
  readonly correlationId?: string;

  constructor(opts: {
    status: number;
    type?: string;
    title?: string;
    detail?: string;
    invalidParams?: InvalidParam[];
    correlationId?: string;
    message?: string;
  }) {
    super(opts.detail || opts.title || opts.message || `Error HTTP ${opts.status}`);
    this.name = 'ApiError';
    this.status = opts.status;
    this.type = opts.type;
    this.title = opts.title;
    this.detail = opts.detail;
    this.invalidParams = opts.invalidParams;
    this.correlationId = opts.correlationId;
  }
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
  let title: string | undefined;
  let detail: string | undefined;
  let invalidParams: InvalidParam[] | undefined;

  if (contentType.includes('json')) {
    try {
      const data = await response.json();

      // Formato 1: RFC 7807 Problem Details (Kong)
      if (data.title || data.type || data.status) {
        type = typeof data.type === 'string' ? data.type : undefined;
        title = data.title;
        detail = data.detail;
        if (Array.isArray(data.invalid_params)) {
          invalidParams = data.invalid_params;
        } else if (Array.isArray(data.errors)) {
          invalidParams = data.errors.map((e: any) => ({
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
          invalidParams = data.detail.map((err: any) => ({
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
    title: title || `Error HTTP ${response.status}`,
    detail: detail || response.statusText,
    invalidParams,
    correlationId: correlationId || response.headers.get('x-correlation-id') || undefined,
  });
}

/** true si `err` es un ApiError con el `type` RFC 7807 indicado. */
export function isProblemType(err: unknown, type: string): err is ApiError {
  return err instanceof ApiError && err.type === type;
}

