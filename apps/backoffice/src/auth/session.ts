import { create } from 'zustand';
import { ApiError, EmailNotVerifiedError, StaffOnlyError, isPlatformStaff, roleFromAccessToken } from '@discordia/core';
import { config } from '../config';
import { auth0Driver } from './auth0';
import type { AuthDriver, StaffUser, TwoFactorVerification } from './driver';
import { TwoFactorCodeError, authErrorDescription, authErrorMessage, isAccessDenied, isSignedOutError } from './errors';

/**
 * Sesión del backoffice. Solo con el rol "staff" (claim https://discordia.app/role del access token) se
 * muestra el backoffice. Es una decisión de interfaz: los datos y las acciones los vuelve a autorizar Kong
 * con validate("staff") y cada servicio (Gateway/docs/ADR-002-Rol-Staff-Backoffice.md).
 *
 *   loading     verificando la sesión
 *   signed_out  sin sesión: el formulario para entrar (email y contraseña, o Google)
 *   two_factor  la cuenta tiene la 2FA activa: falta el código antes de mostrar el backoffice
 *   forbidden   con sesión, pero la cuenta no es staff (o la Action de login la rechazó)
 *   error       Auth0 no respondió o falta configuración: mensaje y reintentar
 *   ready       staff: se muestra el backoffice
 */
export type BackofficeStatus = 'loading' | 'signed_out' | 'two_factor' | 'forbidden' | 'error' | 'ready';

export interface BackofficeSessionState {
  status: BackofficeStatus;
  user: StaffUser | null;
  error: string | null;
}

export const useBackofficeSession = create<BackofficeSessionState>(() => ({ status: 'loading', user: null, error: null }));

const set = (state: Partial<BackofficeSessionState>) => useBackofficeSession.setState(state);

let driver: AuthDriver | null = null;
let starting: Promise<void> | null = null;
/** Token emitido que espera el segundo factor: fuera del estado de React, que no lo necesita. */
let pendingTwoFactorToken: string | null = null;

const EMAIL_NOT_VERIFIED_MESSAGE = 'Tu email todavía no está verificado. Verificalo desde el mail de Auth0 y volvé a entrar.';
const TWO_FACTOR_UNAVAILABLE_MESSAGE =
  'No pudimos verificar la autenticación en dos factores de tu cuenta. Probá de nuevo en unos minutos.';

async function getDriver(): Promise<AuthDriver> {
  driver ??= config.useMock ? (await import('./mock')).mockDriver : auth0Driver;
  return driver;
}

/** Para los tests: otra fuente de sesión. */
export function setAuthDriver(next: AuthDriver | null): void {
  driver = next;
  starting = null;
  pendingTwoFactorToken = null;
}

/**
 * Con un token nuevo (de Google, de la contraseña o de la sesión de Auth0 al recargar): el rol decide si es
 * staff y, si tiene la 2FA activa, falta el código. Si la 2FA no se puede consultar no se entra: para el
 * staff es mejor reintentar que saltear el segundo factor (la web, en cambio, lo saltea).
 */
async function applyToken(token: string): Promise<void> {
  const d = await getDriver();
  const user = await d.getUser();
  if (!isPlatformStaff(roleFromAccessToken(token))) {
    return set({ status: 'forbidden', user, error: null });
  }

  let twoFactor: boolean;
  try {
    twoFactor = await d.isTwoFactorEnabled(token);
  } catch {
    return set({ status: 'error', user: null, error: TWO_FACTOR_UNAVAILABLE_MESSAGE });
  }
  if (twoFactor) {
    pendingTwoFactorToken = token;
    return set({ status: 'two_factor', user, error: null });
  }
  set({ status: 'ready', user, error: null });
}

async function run(): Promise<void> {
  set({ status: 'loading', error: null });
  try {
    const token = await (await getDriver()).start();
    if (!token) return set({ status: 'signed_out', user: null });
    await applyToken(token);
  } catch (err) {
    if (isSignedOutError(err)) return set({ status: 'signed_out', user: null });
    if (isAccessDenied(err)) {
      // La Action también rechaza los emails sin verificar: eso no es "no sos staff"
      if (authErrorDescription(err) === 'email_not_verified') {
        return set({ status: 'error', user: null, error: EMAIL_NOT_VERIFIED_MESSAGE });
      }
      return set({ status: 'forbidden', user: null });
    }
    set({ status: 'error', user: null, error: authErrorMessage(err) });
  }
}

/** Arranca la sesión una sola vez (StrictMode monta dos veces y el /callback no se puede procesar dos). */
export function startSession(): Promise<void> {
  starting ??= run();
  return starting;
}

/** Reintentar después de un error. */
export function retrySession(): Promise<void> {
  starting = run();
  return starting;
}

/**
 * Entrar con email y contraseña. Lo que es del formulario (credenciales incorrectas, Auth0 sin respuesta)
 * se lanza para mostrarlo ahí; lo que es un estado (no es staff, email sin verificar) cambia la pantalla.
 */
export async function loginWithPassword(credentials: { email: string; password: string }): Promise<void> {
  const d = await getDriver();
  let token: string;
  try {
    token = await d.loginWithPassword(credentials);
  } catch (err) {
    if (err instanceof StaffOnlyError) return set({ status: 'forbidden', user: null, error: null });
    if (err instanceof EmailNotVerifiedError) return set({ status: 'error', user: null, error: EMAIL_NOT_VERIFIED_MESSAGE });
    throw err;
  }
  await applyToken(token);
}

export async function loginWithGoogle(): Promise<void> {
  if ((await (await getDriver()).loginWithGoogle()) === 'done') await retrySession();
}

export async function requestPasswordReset(email: string): Promise<void> {
  await (await getDriver()).requestPasswordReset(email);
}

/**
 * Segundo factor: el código de la app autenticadora o uno de recuperación. Válido, se muestra el backoffice.
 *
 * @throws Error con el mensaje para el formulario si el código no es válido o no se pudo verificar
 */
export async function submitTwoFactorCode(code: string): Promise<void> {
  const token = pendingTwoFactorToken;
  if (!token) {
    set({ status: 'signed_out', user: null, error: null });
    throw new Error('La sesión venció. Volvé a entrar.');
  }
  let result: TwoFactorVerification;
  try {
    result = await (await getDriver()).verifyTwoFactor(code, token);
  } catch (err) {
    // Auth-User responde 400 a un código incorrecto o vencido
    if (err instanceof ApiError && err.status === 400) {
      throw new TwoFactorCodeError('Código de verificación incorrecto o expirado.', { cause: err });
    }
    throw new TwoFactorCodeError('No pudimos verificar el código. Probá de nuevo.', { cause: err });
  }
  if (!result.valid) throw new Error('Código de verificación incorrecto o expirado.');
  pendingTwoFactorToken = null;
  set({ status: 'ready', error: null });
}

export async function logout(): Promise<void> {
  pendingTwoFactorToken = null;
  if ((await (await getDriver()).logout()) === 'done') set({ status: 'signed_out', user: null, error: null });
}

/** Token para la API (configureClient de @discordia/core). */
export async function getAccessToken(opts?: { forceRefresh?: boolean }): Promise<string> {
  return (await getDriver()).getToken(opts);
}

/** Un 401 que no se pudo renovar: la sesión de Auth0 venció. */
export function handleAuthFailure(): void {
  pendingTwoFactorToken = null;
  set({ status: 'signed_out', user: null });
}

/** Otro staff suspendió esta cuenta: Kong ya rechaza sus pedidos (403 account-suspended). */
export function handleAccountSuspended(): void {
  set({ status: 'error', user: null, error: 'Tu cuenta fue suspendida por la plataforma. Hablá con otro miembro del staff.' });
}
