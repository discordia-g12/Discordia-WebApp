import { isNewUi } from '../../ui/flag';
import { useAuthForms } from './useAuthForms';
import { AuthScreen } from './AuthScreen';
import { LegacyAuthView } from './legacy/LegacyAuthView';

export { PASSWORD_RESET_SENT_MESSAGE } from './useAuthForms';

/**
 * Acceso (login, registro, recupero y estados de la sesión). Con el flag del rediseño se ve AuthScreen;
 * sin él, la vista anterior. Las dos usan los mismos formularios (useAuthForms).
 */
export function AuthView() {
  const forms = useAuthForms();
  return isNewUi() ? <AuthScreen forms={forms} /> : <LegacyAuthView forms={forms} />;
}
