import { describe, it, expect } from 'vitest';
import { ApiError, isProblemType, parseErrorResponse, PROBLEM_TYPES } from '../errors';

function problem(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });
}

describe('parseErrorResponse - RFC 7807 type', () => {
  it('conserva el type del problema emitido por el backend', async () => {
    const err = await parseErrorResponse(
      problem(403, {
        type: PROBLEM_TYPES.EMAIL_NOT_VERIFIED,
        title: 'Forbidden',
        status: 403,
        detail: 'Email address must be verified before registering in Discordia. Check your inbox.',
      }),
    );
    expect(err.status).toBe(403);
    expect(err.type).toBe(PROBLEM_TYPES.EMAIL_NOT_VERIFIED);
    expect(isProblemType(err, PROBLEM_TYPES.EMAIL_NOT_VERIFIED)).toBe(true);
  });

  it('un 403 genérico (about:blank) no se confunde con email sin verificar', async () => {
    const err = await parseErrorResponse(
      problem(403, { type: 'about:blank', title: 'Forbidden', status: 403, detail: 'Forbidden: staff only' }),
    );
    expect(err.type).toBe('about:blank');
    expect(isProblemType(err, PROBLEM_TYPES.EMAIL_NOT_VERIFIED)).toBe(false);
  });

  it('isProblemType es false para errores que no son ApiError', () => {
    expect(isProblemType(new Error('x'), PROBLEM_TYPES.EMAIL_NOT_VERIFIED)).toBe(false);
    expect(isProblemType(new ApiError({ status: 403 }), PROBLEM_TYPES.EMAIL_NOT_VERIFIED)).toBe(false);
  });
});
