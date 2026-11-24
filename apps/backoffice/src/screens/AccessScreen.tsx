import { useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from 'react';
import { AccountSuspendedError, AuthNetworkError, PASSWORD_RESET_SENT_MESSAGE, describePasswordResetError } from '@discordia/core';
import { BlockButton, DisplayText, GoogleButton, Logo, UnderlineInput } from '@web/ui';
import {
  loginWithGoogle,
  loginWithPassword,
  logout,
  requestPasswordReset,
  retrySession,
  submitTwoFactorCode,
  useBackofficeSession,
} from '../auth/session';
import { config } from '../config';
import { ExternalLink } from '../layout/blocks';
import styles from './AccessScreen.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// El mismo texto que la web: no dice si falló el email o la contraseña
const BAD_CREDENTIALS = 'El correo electrónico o la contraseña son incorrectos.';

/**
 * Todo lo que se ve antes del backoffice, con el mismo acceso que la web (ADR-03): el formulario de campos
 * subrayados en la columna izquierda y la palabra gigante al pie, sobre el resplandor. Entrar con email y
 * contraseña o con Google; recuperar la contraseña; el código de la 2FA; sin permiso (la cuenta no es staff)
 * y error (con reintentar). Cada estado dice qué hacer, como pide la consigna para la capa de presentación.
 */
export function AccessScreen() {
  const { status, error } = useBackofficeSession();
  // Dentro de "sin sesión": el login o el recupero de contraseña
  const [signedOutView, setSignedOutView] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');

  const view = status === 'signed_out' ? signedOutView : status;

  return (
    <div className={styles.screen}>
      <div className={styles.glow} aria-hidden="true" />
      {config.useMock && (
        <p className={styles.mock} role="note">
          modo mock activo (dev)/ ?rol=user: sin acceso · ?2fa=1: pide el código 123456
        </p>
      )}
      <main className={styles.column}>
        <div className={styles.panel} key={view}>
          {view === 'loading' && (
            <p className={styles.lead} role="status">
              verificando tu sesión/
            </p>
          )}
          {view === 'login' && (
            <LoginForm
              email={email}
              onEmailChange={setEmail}
              onForgot={() => setSignedOutView('forgot')}
            />
          )}
          {view === 'forgot' && (
            <ForgotForm email={email} onEmailChange={setEmail} onBack={() => setSignedOutView('login')} />
          )}
          {view === 'two_factor' && <TwoFactorForm />}
          {view === 'forbidden' && <ForbiddenPanel />}
          {view === 'error' && <ErrorPanel error={error} />}
        </div>

        <header className={styles.heading}>
          <p className={styles.brand}>
            <Logo size={20} />
            <span>discordia/ staff</span>
          </p>
          <h1 className={styles.title}>
            <DisplayText active>{HEADINGS[view] ?? 'Backoffice'}</DisplayText>
          </h1>
        </header>
      </main>
    </div>
  );
}

const HEADINGS: Partial<Record<string, string>> = {
  forgot: 'Recuperar contraseña',
  two_factor: 'Dos factores',
  forbidden: 'Sin acceso',
  error: 'Algo falló',
};

// ==========================================
// Formularios
// ==========================================

/** Error que no es de un campo (credenciales, servidor): texto chico con barra inicial, sobre la acción. */
function FormError({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p className={styles.formError} role="alert">
      / {children}
    </p>
  );
}

function LoginForm({ email, onEmailChange, onForgot }: { email: string; onEmailChange: (value: string) => void; onForgot: () => void }) {
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [goingToGoogle, setGoingToGoogle] = useState(false);
  const busy = submitting || goingToGoogle;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanEmail = email.trim();
    if (!EMAIL_REGEX.test(cleanEmail) || !password) {
      setFormError(BAD_CREDENTIALS);
      return;
    }
    setSubmitting(true);
    try {
      await loginWithPassword({ email: cleanEmail, password });
    } catch (err) {
      // Sin respuesta de Auth0 no es un problema de credenciales; el resto, el mensaje genérico (o suspendida)
      setFormError(err instanceof AuthNetworkError || err instanceof AccountSuspendedError ? err.message : BAD_CREDENTIALS);
    } finally {
      setSubmitting(false);
    }
  };

  const google = async () => {
    setFormError(null);
    setGoingToGoogle(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No pudimos abrir el login de Google.');
      setGoingToGoogle(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.lead}>Administración de la plataforma. Solo para el staff de Discordia.</p>
      <UnderlineInput
        size="large"
        label="correo electrónico"
        required
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="staff@discordia.lol"
        autoComplete="email"
        disabled={busy}
      />
      <div className={styles.fieldWithLink}>
        <UnderlineInput
          size="large"
          label="contraseña"
          required
          secret
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="tu contraseña"
          autoComplete="current-password"
          disabled={busy}
        />
        <button type="button" className={styles.forgotLink} onClick={onForgot} disabled={busy}>
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      <FormError>{formError}</FormError>
      <div className={styles.actionsRow}>
        <BlockButton size="large" type="submit" loading={submitting} disabled={goingToGoogle} className={styles.submitButton}>
          Iniciar sesión
        </BlockButton>
        <GoogleButton onPress={() => void google()} loading={goingToGoogle} disabled={submitting} />
      </div>
    </form>
  );
}

function ForgotForm({ email, onEmailChange, onBack }: { email: string; onEmailChange: (value: string) => void; onBack: () => void }) {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanEmail = email.trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setFormError('El formato del correo electrónico no es válido.');
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(cleanEmail);
      setSent(true);
    } catch (err) {
      setFormError(describePasswordResetError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.form}>
        <p className={styles.lead} role="status">
          {PASSWORD_RESET_SENT_MESSAGE}
        </p>
        <div className={styles.actions}>
          <BlockButton size="large" onPress={onBack}>
            Volver
          </BlockButton>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.lead}>Ingresá tu correo y te enviamos un enlace para elegir una contraseña nueva.</p>
      <UnderlineInput
        size="large"
        label="correo electrónico"
        required
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="staff@discordia.lol"
        autoComplete="email"
        disabled={submitting}
      />
      <FormError>{formError}</FormError>
      <div className={styles.actions}>
        <BlockButton size="large" type="submit" loading={submitting}>
          Enviar enlace
        </BlockButton>
        <SecondaryButton onPress={onBack} disabled={submitting}>
          Volver
        </SecondaryButton>
      </div>
    </form>
  );
}

function TwoFactorForm() {
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanCode = code.trim();
    if (!cleanCode) {
      setFormError('Ingresá el código de verificación.');
      return;
    }
    setSubmitting(true);
    try {
      await submitTwoFactorCode(cleanCode);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No pudimos verificar el código. Probá de nuevo.');
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.lead}>
        Tu cuenta tiene activada la autenticación en dos factores. Ingresá el código de 6 dígitos de tu aplicación
        autenticadora o un código de recuperación.
      </p>
      <UnderlineInput
        size="large"
        label="código de verificación"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="ej: 123456 o A1B2-C3D4"
        disabled={submitting}
        autoFocus
        autoComplete="one-time-code"
      />
      <FormError>{formError}</FormError>
      <div className={styles.actions}>
        <BlockButton size="large" type="submit" loading={submitting}>
          Verificar código
        </BlockButton>
        <SecondaryButton onPress={() => void logout()} disabled={submitting}>
          Volver
        </SecondaryButton>
      </div>
    </form>
  );
}

// ==========================================
// Estados de la sesión
// ==========================================

function ForbiddenPanel() {
  return (
    <div className={styles.form}>
      <Alert title="Esta cuenta no es staff de la plataforma.">
        / El rol se asigna por fuera de la app (app_metadata.role = &quot;staff&quot; en Auth0). Si te lo acaban de dar, salí y
        volvé a entrar.
      </Alert>
      <div className={styles.actions}>
        <BlockButton size="large" onPress={() => void logout()}>
          Entrar con otra cuenta
        </BlockButton>
        <ExternalLink href={config.appUrl}>ir a Discordia</ExternalLink>
      </div>
    </div>
  );
}

function ErrorPanel({ error }: { error: string | null }) {
  return (
    <div className={styles.form}>
      <Alert title="No pudimos verificar tu sesión.">/ {error}</Alert>
      <div className={styles.actions}>
        <BlockButton size="large" onPress={() => void retrySession()}>
          Reintentar
        </BlockButton>
        <SecondaryButton onPress={() => void logout()}>Usar otra cuenta</SecondaryButton>
      </div>
    </div>
  );
}

/** Errores: bloque con borde izquierdo rojo (el rojo nunca como texto chico). */
function Alert({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.alert} role="alert">
      <p className={styles.alertTitle}>{title}</p>
      <p className={styles.note}>{children}</p>
    </div>
  );
}

/** Acción secundaria junto al bloque negro: mismo texto en mayúsculas, sin fondo (VOLVER), como en la web. */
function SecondaryButton({
  children,
  onPress,
  ...rest
}: { children: string; onPress: () => void } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>) {
  return (
    <button type="button" className={styles.secondary} onClick={onPress} {...rest}>
      {children}
    </button>
  );
}
