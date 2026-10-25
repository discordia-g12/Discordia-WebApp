import { useAuthForms } from '@discordia/core';
import { authService } from '../../platform/auth/session';
import { AuthScreen } from './AuthScreen';

export { PASSWORD_RESET_SENT_MESSAGE } from '@discordia/core';

/**
 * Acceso (login, registro, recupero y estados de la sesión): AuthScreen sobre useAuthForms de core, el
 * mismo que usa mobile.
 */
export function AuthView() {
  const forms = useAuthForms(authService);
  return <AuthScreen forms={forms} />;
}
