import { useAuthForms } from '@discordia/core';
import { authService } from '../../platform/auth/session';
import { isNewUi } from '../../ui/flag';
import { AuthScreen } from './AuthScreen';
import { LegacyAuthView } from './legacy/LegacyAuthView';

export { PASSWORD_RESET_SENT_MESSAGE } from '@discordia/core';

/**
 * Acceso (login, registro, recupero y estados de la sesión). Con el flag del rediseño se ve AuthScreen;
 * sin él, la vista anterior. Las dos usan los mismos formularios (useAuthForms de core, el mismo que mobile).
 */
export function AuthView() {
  const forms = useAuthForms(authService);
  return isNewUi() ? <AuthScreen forms={forms} /> : <LegacyAuthView forms={forms} />;
}
