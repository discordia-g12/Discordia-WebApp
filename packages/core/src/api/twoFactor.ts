import { api } from './client';
import { getApiMock } from './mock';

export interface TwoFactorStatusResponse {
  enabled: boolean;
  has_recovery_codes: boolean;
  remaining_recovery_codes: number;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauth_url: string;
  qr_code: string;
}

export interface TwoFactorActivateResponse {
  success: boolean;
  recovery_codes: string[];
}

export interface TwoFactorVerifyResponse {
  valid: boolean;
  recovery_code_used: boolean;
  remaining_codes: number;
}

export interface TwoFactorDisableResponse {
  success: boolean;
}

export interface TwoFactorRegenerateResponse {
  recovery_codes: string[];
}

export async function getTwoFactorStatus(overrideToken?: string): Promise<TwoFactorStatusResponse> {
  const mock = getApiMock();
  if (mock?.getTwoFactorStatus) return mock.getTwoFactorStatus();

  return api.get<TwoFactorStatusResponse>('/api/v1/users/me/2fa/status', {
    _overrideToken: overrideToken,
  });
}

export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  const mock = getApiMock();
  if (mock?.setupTwoFactor) return mock.setupTwoFactor();

  return api.post<TwoFactorSetupResponse>('/api/v1/users/me/2fa/setup');
}

export async function activateTwoFactor(code: string): Promise<TwoFactorActivateResponse> {
  const mock = getApiMock();
  if (mock?.activateTwoFactor) return mock.activateTwoFactor(code);

  return api.post<TwoFactorActivateResponse>('/api/v1/users/me/2fa/activate', { code });
}

export async function verifyTwoFactor(code: string, overrideToken?: string): Promise<TwoFactorVerifyResponse> {
  const mock = getApiMock();
  if (mock?.verifyTwoFactor) return mock.verifyTwoFactor(code);

  return api.post<TwoFactorVerifyResponse>(
    '/api/v1/users/me/2fa/verify',
    { code },
    { _overrideToken: overrideToken }
  );
}

export async function disableTwoFactor(password: string): Promise<TwoFactorDisableResponse> {
  const mock = getApiMock();
  if (mock?.disableTwoFactor) return mock.disableTwoFactor(password);

  return api.post<TwoFactorDisableResponse>('/api/v1/users/me/2fa/disable', { password });
}

export async function regenerateRecoveryCodes(): Promise<TwoFactorRegenerateResponse> {
  const mock = getApiMock();
  if (mock?.regenerateRecoveryCodes) return mock.regenerateRecoveryCodes();

  return api.post<TwoFactorRegenerateResponse>('/api/v1/users/me/2fa/recovery-codes');
}

