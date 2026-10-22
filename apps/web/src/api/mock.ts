import { createApiMock } from '@discordia/core/testing';
import { isMockNeedsProfile, setMockProfileCompleted } from '../auth/mock';

/**
 * Respuestas de la API en modo mock (solo desarrollo, VITE_USE_MOCK=true). Se registran en core con
 * setApiMock desde auth/session.ts, con import() dinámico: no llegan al build de producción.
 */
export const apiMock = createApiMock({
  needsProfile: isMockNeedsProfile,
  onProfileCompleted: setMockProfileCompleted,
});
