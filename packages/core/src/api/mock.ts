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
}

let apiMock: ApiMock | null = null;

export function setApiMock(mock: ApiMock | null): void {
  apiMock = mock;
}

export function getApiMock(): ApiMock | null {
  return apiMock;
}
