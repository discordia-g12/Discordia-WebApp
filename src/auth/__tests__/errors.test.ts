import { describe, it, expect } from 'vitest';
import {
  AccountSuspendedError,
  AUTH_DENY_CODES,
  classifyAuthDenial,
  EmailNotVerifiedError,
} from '../errors';

describe('classifyAuthDenial', () => {
  it('reconoce los errores tipados', () => {
    expect(classifyAuthDenial(new EmailNotVerifiedError('a@b.com'))).toBe('email_not_verified');
    expect(classifyAuthDenial(new AccountSuspendedError())).toBe('suspended');
  });

  it('decide por error_description cuando error es access_denied (GenericError de auth0-spa-js / body de /oauth/token)', () => {
    expect(
      classifyAuthDenial({ error: 'access_denied', error_description: AUTH_DENY_CODES.EMAIL_NOT_VERIFIED }),
    ).toBe('email_not_verified');
    expect(classifyAuthDenial({ error: 'access_denied', error_description: 'user is blocked' })).toBe('suspended');
  });

  it('mantiene compatibilidad con Error planos "access_denied: <detalle>"', () => {
    expect(classifyAuthDenial(new Error('access_denied: user is blocked'))).toBe('suspended');
    expect(classifyAuthDenial(new Error('access_denied: email_not_verified'))).toBe('email_not_verified');
  });

  it('devuelve null para errores que no son rechazos del IdP', () => {
    expect(classifyAuthDenial(new Error('login_required'))).toBeNull();
    expect(classifyAuthDenial({ error: 'invalid_grant', error_description: 'Wrong email or password.' })).toBeNull();
    expect(classifyAuthDenial(new Error('El correo electrónico o la contraseña son incorrectos.'))).toBeNull();
    expect(classifyAuthDenial(undefined)).toBeNull();
    expect(classifyAuthDenial(null)).toBeNull();
  });

  it('el texto del mensaje NO decide: "email_not_verified" sin access_denied no es un rechazo', () => {
    expect(classifyAuthDenial(new Error('email_not_verified'))).toBeNull();
  });
});
