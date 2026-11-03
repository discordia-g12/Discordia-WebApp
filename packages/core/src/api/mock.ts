import type { Server } from '../types';
import type { CreateServerRequest } from './servers';
import type {
  TwoFactorActivateResponse,
  TwoFactorDisableResponse,
  TwoFactorRegenerateResponse,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
  TwoFactorVerifyResponse,
} from './twoFactor';
import type { CreateProfileRequest, UserProfile } from './users';

/**
 * Respuestas simuladas para desarrollar sin backend. Las registra cada app (la web, con VITE_USE_MOCK en
 * desarrollo): core no conoce los datos de prueba ni las variables de entorno de cada plataforma.
 */
export interface ApiMock {
  getMyProfile(): Promise<UserProfile>;
  upsertMyProfile(payload: CreateProfileRequest): Promise<UserProfile>;
  getUsersBulk(userIds: string[]): Promise<UserProfile[]>;
  requestPasswordReset(email: string): Promise<void>;
  getServers?(): Promise<Server[]>;
  createServer?(payload: CreateServerRequest): Promise<Server>;
  getTwoFactorStatus?(): Promise<TwoFactorStatusResponse>;
  setupTwoFactor?(): Promise<TwoFactorSetupResponse>;
  activateTwoFactor?(code: string): Promise<TwoFactorActivateResponse>;
  verifyTwoFactor?(code: string): Promise<TwoFactorVerifyResponse>;
  disableTwoFactor?(password: string): Promise<TwoFactorDisableResponse>;
  regenerateRecoveryCodes?(): Promise<TwoFactorRegenerateResponse>;
}

let apiMock: ApiMock | null = null;

export function setApiMock(mock: ApiMock | null): void {
  apiMock = mock;
}

export function getApiMock(): ApiMock | null {
  return apiMock;
}
