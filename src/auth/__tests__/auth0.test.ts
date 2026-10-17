import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auth0Provider } from '../auth0';
import { AccountSuspendedError, EmailNotVerifiedError } from '../errors';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function fakeIdToken(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.sig`;
}

const CREDS = { email: 'nuevo@discordia.com', password: 'Password123!' };

describe('auth0Provider.loginWithCredentials - respuestas de /oauth/token', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Action deny con email_not_verified -> EmailNotVerifiedError con el email', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(403, { error: 'access_denied', error_description: 'email_not_verified' }),
    );

    const err = await auth0Provider.loginWithCredentials(CREDS).catch((e) => e);

    expect(err).toBeInstanceOf(EmailNotVerifiedError);
    expect((err as EmailNotVerifiedError).email).toBe(CREDS.email);
  });

  it('access_denied con otro motivo -> AccountSuspendedError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(403, { error: 'access_denied', error_description: 'account_suspended' }),
    );

    await expect(auth0Provider.loginWithCredentials(CREDS)).rejects.toBeInstanceOf(AccountSuspendedError);
  });

  it('CA 2/CA 3 Login: contraseña incorrecta (invalid_grant, también 403) mantiene el error genérico', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(403, { error: 'invalid_grant', error_description: 'Wrong email or password.' }),
    );

    const err = await auth0Provider.loginWithCredentials(CREDS).catch((e) => e);

    expect(err).not.toBeInstanceOf(EmailNotVerifiedError);
    expect(err).not.toBeInstanceOf(AccountSuspendedError);
    expect((err as Error).message).toBe('El correo electrónico o la contraseña son incorrectos.');
  });

  it('lee el username elegido al registrarse desde el claim del ID token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(200, {
        access_token: 'at-123',
        expires_in: 3600,
        id_token: fakeIdToken({
          sub: 'auth0|abc',
          email: CREDS.email,
          nickname: 'nuevo',
          'https://discordia.app/username': 'cyber_knight',
        }),
      }),
    );

    await auth0Provider.loginWithCredentials(CREDS);
    const user = await auth0Provider.getUser();

    expect(user?.username).toBe('cyber_knight');
    expect(user?.nickname).toBe('nuevo');
  });
});

describe('auth0Provider.signupWithCredentials', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('signup OK + login rechazado por verificación -> propaga EmailNotVerifiedError (la cuenta ya existe)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { _id: 'abc', email: CREDS.email }))
      .mockResolvedValueOnce(jsonResponse(403, { error: 'access_denied', error_description: 'email_not_verified' }));

    const err = await auth0Provider
      .signupWithCredentials({ ...CREDS, username: 'cyber_knight' })
      .catch((e) => e);

    expect(err).toBeInstanceOf(EmailNotVerifiedError);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // El username viaja en user_metadata: la Action lo devuelve en el ID token tras verificar.
    const signupBody = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(signupBody.user_metadata.username).toBe('cyber_knight');
  });
});
