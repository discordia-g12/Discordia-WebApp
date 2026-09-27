import { NetworkError, TimeoutError, parseErrorResponse } from './errors';

export interface ClientConfig {
  baseUrl: string;
  getToken: (opts?: { forceRefresh?: boolean }) => Promise<string>;
  onAuthFailure: () => void;
  timeoutMs: number;
}

let clientConfig: ClientConfig = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  getToken: async () => '',
  onAuthFailure: () => {},
  timeoutMs: 15_000,
};

export function configureClient(config: Partial<ClientConfig>): void {
  clientConfig = { ...clientConfig, ...config };
}

export function getClientConfig(): ClientConfig {
  return clientConfig;
}

export interface RequestOptions {
  body?: any;
  query?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  _isRetry?: boolean;
  _overrideToken?: string;
}

let refreshingPromise: Promise<string> | null = null;

function refreshOnce(): Promise<string> {
  if (!refreshingPromise) {
    refreshingPromise = (async () => {
      try {
        return await clientConfig.getToken({ forceRefresh: true });
      } finally {
        refreshingPromise = null;
      }
    })();
  }
  return refreshingPromise;
}

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function request<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    body,
    query,
    idempotencyKey,
    signal,
    timeoutMs = clientConfig.timeoutMs,
    headers: customHeaders = {},
    skipAuth = false,
    _isRetry = false,
    _overrideToken,
  } = options;

  // Construir URL completa con query params
  let url = `${clientConfig.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(query)) {
      if (val !== undefined && val !== null) {
        params.append(key, String(val));
      }
    }
    const queryString = params.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Obtener access token en memoria
  let token = skipAuth ? '' : _overrideToken || '';
  if (!token && !skipAuth) {
    try {
      token = await clientConfig.getToken();
    } catch (err) {
      if (!_isRetry) {
        clientConfig.onAuthFailure();
      }
      throw err;
    }
  }

  // Encabezados
  const correlationId = customHeaders['X-Correlation-ID'] || generateCorrelationId();
  const headers: Record<string, string> = {
    'X-Correlation-ID': correlationId,
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Configuración de Timeout y AbortController
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  // Escuchar señal externa si fue provista
  const handleExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw new TimeoutError('Petición cancelada antes de iniciar.');
    }
    signal.addEventListener('abort', handleExternalAbort);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'same-origin', 
    });
  } catch (err: any) {
    if (timedOut) {
      throw new TimeoutError();
    }
    if (err.name === 'AbortError' && signal?.aborted) {
      throw err;
    }
    throw new NetworkError(err?.message || 'Error de conexión de red.');
  } finally {
    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener('abort', handleExternalAbort);
    }
  }

  // Interceptor 401 con Deduplicación y Reintento único
  if (response.status === 401 && !skipAuth) {
    if (_isRetry) {
      clientConfig.onAuthFailure();
      throw await parseErrorResponse(response, correlationId);
    }

    let newToken = '';
    try {
      newToken = await refreshOnce();
    } catch {
      clientConfig.onAuthFailure();
      throw await parseErrorResponse(response, correlationId);
    }

    return await request<T>(method, path, {
      ...options,
      _isRetry: true,
      _overrideToken: newToken,
    });
  }

  if (!response.ok) {
    throw await parseErrorResponse(response, correlationId);
  }

  // Respuestas sin contenido (204 No Content)
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: any, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: any, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: any, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
};
