import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useSession, authService, type SessionStatus } from '../../platform/auth/session';
import { BlockButton, DisplayText, UnderlineInput, useMotionPreset } from '../../ui';
import { PASSWORD_RESET_SENT_MESSAGE, sanitizeUsername, type AuthField, type AuthForms } from './useAuthForms';
import styles from './AuthScreen.module.css';

/**
 * Acceso del rediseño (PDF, págs. 3 a 5): formulario de campos subrayados en la columna izquierda y,
 * al pie, las palabras gigantes que navegan (INICIAR SESIÓN / REGISTRARSE) o titulan el estado
 * (VERIFICANDO SESIÓN, CUENTA SUSPENDIDA, ...). La lógica es la de useAuthForms.
 *
 * Movimiento: al cambiar entre login y registro, las letras de la palabra activa suben y se oscurecen
 * (DisplayText) y el formulario nuevo entra con un fundido; los demás estados entran subiendo.
 */
export function AuthScreen({ forms }: { forms: AuthForms }) {
  const { status, isMock } = useSession();
  const view = status === 'unauthenticated' ? forms.activeTab : status;

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

type View = SessionStatus | AuthForms['activeTab'];

function renderPanel(view: View, forms: AuthForms): ReactNode {
  switch (view) {
    case 'login':
      return <LoginForm forms={forms} />;
    case 'register':
      return <RegisterForm forms={forms} />;
    case 'forgot':
      return <ForgotForm forms={forms} />;
    case 'bootstrapping':
      return (
        <p className={styles.srOnly} role="status">
          Cargando tu perfil e información de Discordia.
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

/** El panel de cada vista entra con un fundido (se vuelve a montar al cambiar de vista). */
function Panel({ children }: { children: ReactNode }) {
  const fade = useMotionPreset('fade');
  return (
    <motion.div className={styles.panel} {...fade} exit={undefined}>
      {children}
    </motion.div>
  );
}

// ==========================================
// Palabras gigantes del pie
// ==========================================

function Heading({ view, forms }: { view: View; forms: AuthForms }) {
  const rise = useMotionPreset('rise');

  // Login y registro comparten encabezado: las palabras no se vuelven a montar, se intercambian
  if (view === 'login' || view === 'register') {
    return (
      <nav className={styles.heading} aria-label="Acceso">
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
        <DisplayText active>{title.main}</DisplayText>
        {title.rest && (
          <span className={styles.titleRest}>
            <DisplayText>{title.rest}</DisplayText>
            {view === 'bootstrapping' && <SessionProgress />}
          </span>
        )}
      </h1>
    </motion.header>
  );
}

/** Título de cada estado: la primera parte en el color del texto y la segunda (si hay) en gris. */
const HEADINGS: Partial<Record<View, { main: string; rest?: string }>> = {
  forgot: { main: 'Recuperar contraseña' },
  bootstrapping: { main: 'Verificando', rest: 'Sesión' },
  error: { main: 'Algo falló' },
  suspended: { main: 'Cuenta suspendida' },
  email_unverified: { main: 'Verificá tu email' },
  needs_profile: { main: 'Elegí tu usuario' },
};

/** Barra bajo "SESIÓN" que se va llenando mientras se verifica (indeterminada: no hay un avance real). */
function SessionProgress() {
  return (
    <span className={styles.progress} role="progressbar" aria-label="Verificando sesión">
      <span className={styles.progressFill} />
    </span>
  );
}

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

function LoginForm({ forms }: { forms: AuthForms }) {
  const { login, isSubmitting } = forms;
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
        disabled={isSubmitting}
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
          disabled={isSubmitting}
        />
        <button
          type="button"
          className={styles.forgotLink}
          data-testid="link-forgot-password"
          onClick={() => forms.openForgot(login.email.trim())}
          disabled={isSubmitting}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      <FormError>{generalError(forms)}</FormError>
      <BlockButton size="large" type="submit" loading={isSubmitting} data-testid="btn-submit-login">
        Iniciar sesión
      </BlockButton>
    </form>
  );
}

function RegisterForm({ forms }: { forms: AuthForms }) {
  const { register, isSubmitting } = forms;
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
        disabled={isSubmitting}
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
        disabled={isSubmitting}
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
          disabled={isSubmitting}
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
        disabled={isSubmitting}
      />
      <FormError>{generalError(forms)}</FormError>
      <BlockButton size="large" type="submit" loading={isSubmitting} data-testid="btn-submit-register">
        Crear cuenta
      </BlockButton>
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
        Tu cuenta fue autenticada, pero el nombre de usuario ya está en uso. Elegí uno disponible.
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
