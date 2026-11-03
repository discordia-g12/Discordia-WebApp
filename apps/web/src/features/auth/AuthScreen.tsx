import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useSession, authService, hasStoredSession, type SessionStatus } from '../../platform/auth/session';
import { BlockButton, DisplayText, UnderlineInput, useMotionPreset } from '../../ui';
import { PASSWORD_RESET_SENT_MESSAGE, sanitizeUsername, type AuthField, type AuthForms } from '@discordia/core';
import styles from './AuthScreen.module.css';

/**
 * Acceso del rediseño (PDF, págs. 3 a 5): formulario de campos subrayados en la columna izquierda y,
 * al pie, las palabras gigantes que navegan (INICIAR SESIÓN / REGISTRARSE) o titulan el estado
 * (CUENTA SUSPENDIDA, ...). La lógica es la de useAuthForms.
 *
 * Arranque: no hay pantalla de "verificando sesión". Mientras la sesión arranca se muestra lo que
 * probablemente venga: el login (si no hay una sesión guardada), que ya entra animado y se puede ir
 * completando, o solo el fondo (si la hay), hasta que aparece la app.
 *
 * Movimiento: los campos del formulario y las palabras del pie entran subiendo uno tras otro; al cambiar
 * entre login y registro, las letras de la palabra activa suben y se oscurecen (DisplayText).
 */
export function AuthScreen({ forms }: { forms: AuthForms }) {
  const { status, isMock } = useSession();
  // Se decide una vez: si cambiara mientras arranca, el login aparecería y desaparecería
  const [resuming] = useState(hasStoredSession);
  const view: View =
    status === 'unauthenticated' || (status === 'bootstrapping' && !resuming)
      ? forms.activeTab
      : status === 'bootstrapping'
        ? 'resuming'
        : status;

  return (
    <div className={styles.screen}>
      <div className={styles.glow} aria-hidden="true" />
      {isMock && (
        <p className={styles.mock} role="note">
          modo mock activo (dev)/ autenticación simulada en memoria
        </p>
      )}
      <main className={styles.column}>
        <Panel key={view}>{renderPanel(view, forms)}</Panel>
        <Heading view={view} forms={forms} />
      </main>
    </div>
  );
}

/** resuming: arrancando con una sesión guardada (se ve solo el fondo hasta que aparece la app). */
type View = Exclude<SessionStatus, 'bootstrapping'> | AuthForms['activeTab'] | 'resuming';

function renderPanel(view: View, forms: AuthForms): ReactNode {
  switch (view) {
    case 'login':
      return <LoginForm forms={forms} />;
    case 'register':
      return <RegisterForm forms={forms} />;
    case 'forgot':
      return <ForgotForm forms={forms} />;
    case 'resuming':
      return (
        <p className={styles.srOnly} role="status">
          Recuperando tu sesión.
        </p>
      );
    case 'error':
      return <ErrorPanel />;
    case 'suspended':
      return <SuspendedPanel />;
    case 'email_unverified':
      return <EmailUnverifiedPanel forms={forms} />;
    case 'needs_profile':
      return <NeedsProfileForm forms={forms} />;
    default:
      return null;
  }
}

/** El panel de cada vista se vuelve a montar al cambiar de vista: sus elementos entran escalonados (CSS). */
function Panel({ children }: { children: ReactNode }) {
  return <div className={styles.panel}>{children}</div>;
}

// ==========================================
// Palabras gigantes del pie
// ==========================================

function Heading({ view, forms }: { view: View; forms: AuthForms }) {
  const rise = useMotionPreset('rise');

  // Login y registro comparten encabezado: las palabras no se vuelven a montar, se intercambian
  if (view === 'login' || view === 'register') {
    return (
      <nav className={`${styles.heading} ${styles.navHeading}`} aria-label="Acceso">
        <DisplayText active={view === 'login'} onPress={() => forms.switchTab('login')} data-testid="tab-login">
          Iniciar sesión
        </DisplayText>
        <DisplayText active={view === 'register'} onPress={() => forms.switchTab('register')} data-testid="tab-register">
          Registrarse
        </DisplayText>
      </nav>
    );
  }

  const title = HEADINGS[view];
  if (!title) return null;

  return (
    <motion.header key={view} className={styles.heading} {...rise} exit={undefined}>
      <h1 className={styles.title}>
        <DisplayText active>{title}</DisplayText>
      </h1>
    </motion.header>
  );
}

/** Título de cada estado. */
const HEADINGS: Partial<Record<View, string>> = {
  forgot: 'Recuperar contraseña',
  error: 'Algo falló',
  suspended: 'Cuenta suspendida',
  email_unverified: 'Verificá tu email',
  needs_profile: 'Elegí tu usuario',
};

// ==========================================
// Formularios
// ==========================================

/** Lleva el foco al campo con error para que se lea y se pueda corregir enseguida. */
function useFocusOnError(error: string | null, field: AuthField | null) {
  const refs = useRef<Partial<Record<AuthField, HTMLInputElement | null>>>({});
  useEffect(() => {
    if (error && field) refs.current[field]?.focus();
  }, [error, field]);
  return (name: AuthField) => (el: HTMLInputElement | null) => {
    refs.current[name] = el;
  };
}

/** Error que no es de un campo (credenciales, servidor): texto chico con barra inicial, sobre la acción. */
function FormError({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p className={styles.formError} role="alert">
      / {children}
    </p>
  );
}

const fieldError = (forms: AuthForms, field: AuthField) =>
  forms.errorField === field ? (forms.formError ?? undefined) : undefined;

const generalError = (forms: AuthForms) => (forms.errorField ? null : forms.formError);

/**
 * Mientras la sesión arranca el formulario ya se ve y se puede completar, pero no enviar: con el botón
 * deshabilitado tampoco se envía con Enter.
 */
const useSessionStarting = () => useSession((s) => s.status === 'bootstrapping');

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.googleIcon}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm({ forms }: { forms: AuthForms }) {
  const { login, isSubmitting, isSubmittingGoogle, handleGoogleLogin } = forms;
  const starting = useSessionStarting();
  return (
    <form className={styles.form} onSubmit={forms.handleLoginSubmit} noValidate>
      <UnderlineInput
        size="large"
        label="correo electrónico"
        required
        type="email"
        value={login.email}
        onChange={(e) => login.setEmail(e.target.value)}
        placeholder="ejemplo@discordia.com"
        autoComplete="email"
        disabled={isSubmitting || isSubmittingGoogle}
      />
      <div className={styles.fieldWithLink}>
        <UnderlineInput
          size="large"
          label="contraseña"
          required
          secret
          value={login.password}
          onChange={(e) => login.setPassword(e.target.value)}
          placeholder="tu contraseña"
          autoComplete="current-password"
          disabled={isSubmitting || isSubmittingGoogle}
        />
        <button
          type="button"
          className={styles.forgotLink}
          data-testid="link-forgot-password"
          onClick={() => forms.openForgot(login.email.trim())}
          disabled={isSubmitting || isSubmittingGoogle}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      <FormError>{generalError(forms)}</FormError>
      <div className={styles.authActions}>
        <BlockButton size="large" type="submit" loading={isSubmitting} disabled={starting || isSubmittingGoogle} data-testid="btn-submit-login">
          Iniciar sesión
        </BlockButton>

        <div className={styles.divider}>
          <span>o</span>
        </div>

        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogleLogin}
          disabled={starting || isSubmitting || isSubmittingGoogle}
          data-testid="btn-login-google"
          aria-label="Continuar con Google"
        >
          <GoogleIcon />
          <span>Continuar con Google</span>
          {isSubmittingGoogle && <span className={styles.googleProgress} aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}

function RegisterForm({ forms }: { forms: AuthForms }) {
  const { register, isSubmitting, isSubmittingGoogle, handleGoogleLogin } = forms;
  const starting = useSessionStarting();
  const fieldRef = useFocusOnError(forms.formError, forms.errorField);
  const rules = [
    { met: register.passwordRules.length, label: 'mínimo 8 caracteres' },
    { met: register.passwordRules.upper && register.passwordRules.lower, label: 'mayúsculas y minúsculas' },
    { met: register.passwordRules.number, label: 'al menos un número' },
  ];

  return (
    <form className={styles.form} onSubmit={forms.handleRegisterSubmit} noValidate>
      <UnderlineInput
        size="large"
        ref={fieldRef('username')}
        label="nombre de usuario"
        required
        value={register.username}
        onChange={(e) => register.setUsername(sanitizeUsername(e.target.value))}
        placeholder="ej: alexr"
        hint="Tu nombre de usuario es único en Discordia (mínimo 3 caracteres alfanuméricos)."
        error={fieldError(forms, 'username')}
        autoComplete="username"
        maxLength={32}
        disabled={isSubmitting || isSubmittingGoogle}
      />
      <UnderlineInput
        size="large"
        ref={fieldRef('email')}
        label="correo electrónico"
        required
        type="email"
        value={register.email}
        onChange={(e) => register.setEmail(e.target.value)}
        placeholder="ejemplo@discordia.com"
        error={fieldError(forms, 'email')}
        autoComplete="email"
        disabled={isSubmitting || isSubmittingGoogle}
      />
      <div>
        <UnderlineInput
          size="large"
          ref={fieldRef('password')}
          label="contraseña"
          required
          secret
          value={register.password}
          onChange={(e) => register.setPassword(e.target.value)}
          placeholder="mínimo 8 caracteres"
          error={fieldError(forms, 'password')}
          autoComplete="new-password"
          disabled={isSubmitting || isSubmittingGoogle}
        />
        {/* Requisitos (CA 4): se marcan a medida que se cumplen */}
        <ul className={styles.rules} aria-label="Requisitos de la contraseña">
          {rules.map((rule) => (
            <li key={rule.label} className={rule.met ? styles.ruleMet : undefined}>
              {rule.met ? '✓' : '/'} {rule.label}
              <span className={styles.srOnly}>{rule.met ? ': cumplido' : ': pendiente'}</span>
            </li>
          ))}
        </ul>
      </div>
      <UnderlineInput
        size="large"
        ref={fieldRef('confirm')}
        label="confirmar contraseña"
        required
        secret
        value={register.confirmPassword}
        onChange={(e) => register.setConfirmPassword(e.target.value)}
        placeholder="repite tu contraseña"
        error={fieldError(forms, 'confirm')}
        autoComplete="new-password"
        disabled={isSubmitting || isSubmittingGoogle}
      />
      <FormError>{generalError(forms)}</FormError>
      <div className={styles.authActions}>
        <BlockButton size="large" type="submit" loading={isSubmitting} disabled={starting || isSubmittingGoogle} data-testid="btn-submit-register">
          Crear cuenta
        </BlockButton>

        <div className={styles.divider}>
          <span>o</span>
        </div>

        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogleLogin}
          disabled={starting || isSubmitting || isSubmittingGoogle}
          data-testid="btn-register-google"
          aria-label="Registrarse con Google"
        >
          <GoogleIcon />
          <span>Continuar con Google</span>
          {isSubmittingGoogle && <span className={styles.googleProgress} aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}

function ForgotForm({ forms }: { forms: AuthForms }) {
  const { forgot, isSubmitting } = forms;
  const fieldRef = useFocusOnError(forms.formError, forms.errorField);

  if (forgot.sent) {
    return (
      <div className={styles.form} data-testid="forgot-sent">
        <p className={styles.lead} role="status">
          {PASSWORD_RESET_SENT_MESSAGE}
        </p>
        <p className={styles.note}>/ ¿No lo encontrás? Revisá la carpeta de spam o correo no deseado.</p>
        <BlockButton size="large" onPress={forms.backToLoginTab} data-testid="btn-forgot-back-to-login">
          Volver a iniciar sesión
        </BlockButton>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={forms.handleForgotSubmit} noValidate>
      <p className={styles.lead}>Ingresá tu correo y te enviamos un enlace para elegir una contraseña nueva.</p>
      <UnderlineInput
        size="large"
        ref={fieldRef('email')}
        label="correo electrónico"
        required
        type="email"
        value={forgot.email}
        onChange={(e) => forgot.setEmail(e.target.value)}
        placeholder="ejemplo@discordia.com"
        error={fieldError(forms, 'email')}
        autoComplete="email"
        disabled={isSubmitting}
        data-testid="input-forgot-email"
      />
      <FormError>{generalError(forms)}</FormError>
      <div className={styles.actions}>
        <BlockButton size="large" type="submit" loading={isSubmitting} data-testid="btn-submit-forgot">
          Enviar enlace
        </BlockButton>
        <SecondaryButton onPress={forms.backToLoginTab} disabled={isSubmitting} data-testid="btn-forgot-back-to-login">
          Volver
        </SecondaryButton>
      </div>
    </form>
  );
}

function NeedsProfileForm({ forms }: { forms: AuthForms }) {
  const { conflict } = forms;
  const fieldRef = useFocusOnError(conflict.error, forms.errorField);
  const usernameError = forms.errorField === 'username' ? (conflict.error ?? undefined) : undefined;

  return (
    <form className={styles.form} onSubmit={forms.handleConflictSubmit} noValidate>
      <p className={styles.lead}>
        Tu cuenta fue autenticada. Elegí tu nombre de usuario y tu nombre visible para entrar a Discordia.
      </p>
      <UnderlineInput
        size="large"
        ref={fieldRef('username')}
        label="nombre de usuario"
        required
        value={conflict.username}
        onChange={(e) => conflict.setUsername(sanitizeUsername(e.target.value))}
        placeholder="ej: alexr_2026"
        error={usernameError}
        disabled={conflict.isSubmitting}
        autoFocus
      />
      <UnderlineInput
        size="large"
        label="nombre público (opcional)"
        value={conflict.displayName}
        onChange={(e) => conflict.setDisplayName(e.target.value)}
        placeholder="ej: Alex Rivera"
        disabled={conflict.isSubmitting}
      />
      <FormError>{usernameError ? null : conflict.error}</FormError>
      <BlockButton size="large" type="submit" loading={conflict.isSubmitting}>
        Entrar a Discordia
      </BlockButton>
    </form>
  );
}

/** Acción secundaria junto al bloque negro: mismo texto en mayúsculas, sin fondo (VOLVER). */
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

// ==========================================
// Estados de la sesión
// ==========================================

function ErrorPanel() {
  const { error } = useSession();
  return (
    <div className={styles.form}>
      {error?.title && <p className={styles.leadStrong}>{error.title}</p>}
      <p className={styles.lead}>{error?.message || 'Ocurrió un error al procesar tu cuenta.'}</p>
      {error?.detail && <p className={styles.note}>/ {error.detail}</p>}
      <BlockButton size="large" onPress={() => authService.retryBootstrap()}>Reintentar</BlockButton>
    </div>
  );
}

function SuspendedPanel() {
  return (
    <div className={styles.form}>
      <p className={styles.lead}>
        Tu cuenta ha sido suspendida temporal o permanentemente por el equipo de moderación.
      </p>
      <BlockButton size="large" onPress={() => authService.logout()}>Cerrar sesión</BlockButton>
    </div>
  );
}

function EmailUnverifiedPanel({ forms }: { forms: AuthForms }) {
  const { pendingEmail } = useSession();
  return (
    <div className={styles.form} data-testid="email-unverified-screen">
      <p className={styles.lead}>
        {pendingEmail ? (
          <>
            Te enviamos un enlace de verificación a <strong>{pendingEmail}</strong>.
          </>
        ) : (
          'Te enviamos un enlace de verificación a tu casilla de correo.'
        )}{' '}
        Abrilo para activar tu cuenta y después volvé a iniciar sesión.
      </p>
      <p className={styles.note}>/ ¿No lo encontrás? Revisá la carpeta de spam o correo no deseado.</p>
      <div className={styles.actions}>
        <BlockButton size="large" onPress={forms.handleVerifiedRetry} data-testid="btn-verified-retry">
          Ya lo verifiqué
        </BlockButton>
        <SecondaryButton onPress={forms.handleUseOtherAccount} data-testid="btn-use-other-account">
          Usar otra cuenta
        </SecondaryButton>
      </div>
    </div>
  );
}
