import { create } from 'zustand';
import { isPlatformStaff, roleFromAccessToken } from '@discordia/core';
import { config } from '../config';
import { auth0Driver } from './auth0';
import type { AuthDriver, StaffUser } from './driver';
import { authErrorDescription, authErrorMessage, isAccessDenied, isSignedOutError } from './errors';

/**
 * Sesión del backoffice. Solo con el rol "staff" (claim https://discordia.app/role del access token) se
 * muestra el backoffice. Es una decisión de interfaz: los datos y las acciones los vuelve a autorizar Kong
 * con validate("staff") y cada servicio (Gateway/docs/ADR-002-Rol-Staff-Backoffice.md).
 *
 *   loading     verificando la sesión
 *   signed_out  sin sesión: botón para entrar
 *   forbidden   con sesión, pero la cuenta no es staff (o la Action de login la rechazó)
 *   error       Auth0 no respondió o falta configuración: mensaje y reintentar
 *   ready       staff: se muestra el backoffice
 */
export type BackofficeStatus = 'loading' | 'signed_out' | 'forbidden' | 'error' | 'ready';

export interface BackofficeSessionState {
  status: BackofficeStatus;
  user: StaffUser | null;
  error: string | null;
}

export const useBackofficeSession = create<BackofficeSessionState>(() => ({ status: 'loading', user: null, error: null }));

const set = (state: Partial<BackofficeSessionState>) => useBackofficeSession.setState(state);

let driver: AuthDriver | null = null;
let starting: Promise<void> | null = null;

async function getDriver(): Promise<AuthDriver> {
  driver ??= config.useMock ? (await import('./mock')).mockDriver : auth0Driver;
  return driver;
}

/** Para los tests: otra fuente de sesión. */
export function setAuthDriver(next: AuthDriver | null): void {
  driver = next;
  starting = null;
}

async function applyToken(token: string): Promise<void> {
  const role = roleFromAccessToken(token);
  const user = await (await getDriver()).getUser();
  set({ status: isPlatformStaff(role) ? 'ready' : 'forbidden', user, error: null });
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
        return set({ status: 'error', user: null, error: 'Tu email todavía no está verificado. Verificalo desde el mail de Auth0 y volvé a entrar.' });
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

export async function login(): Promise<void> {
  if ((await (await getDriver()).login()) === 'done') await retrySession();
}

export async function logout(): Promise<void> {
  if ((await (await getDriver()).logout()) === 'done') set({ status: 'signed_out', user: null, error: null });
}

/** Token para la API (configureClient de @discordia/core). */
export async function getAccessToken(opts?: { forceRefresh?: boolean }): Promise<string> {
  return (await getDriver()).getToken(opts);
}

/** Un 401 que no se pudo renovar: la sesión de Auth0 venció. */
export function handleAuthFailure(): void {
  set({ status: 'signed_out', user: null });
}

/** Otro staff suspendió esta cuenta: Kong ya rechaza sus pedidos (403 account-suspended). */
export function handleAccountSuspended(): void {
  set({ status: 'error', user: null, error: 'Tu cuenta fue suspendida por la plataforma. Hablá con otro miembro del staff.' });
}
