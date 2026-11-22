import { useEffect, useState } from 'react';
import { ApiError, errorDetail } from '../api/errors';
import { requestPasswordReset } from '../api/passwordReset';
import { verifyTwoFactor } from '../api/twoFactor';
import { upsertMyProfile } from '../api/users';
import type { AuthUser } from './adapter';
import { AccountSuspendedError, AuthNetworkError, SignupConflictError, TwoFactorRequiredError } from './errors';
import {
  backToLogin,
  completeTwoFactorSession,
  loginWithCredentials,
  logout,
  retryBootstrap,
  signupWithCredentials,
  useSession,
} from './session';

/**
 * Estado y reglas de los formularios de acceso (login, registro, recupero de contraseña, elección de
 * nombre de usuario y verificación 2FA). Lo usan la web (AuthScreen y la vista anterior) y mobile, así
 * las validaciones y los mensajes son los mismos en todas.
 */

/** Acciones de la sesión que usan los formularios. La web pasa su authService (los tests lo espían). */
export interface AuthFormActions {
  loginWithCredentials: typeof loginWithCredentials;
  signupWithCredentials: typeof signupWithCredentials;
  logout: typeof logout;
  backToLogin: typeof backToLogin;
  retryBootstrap: typeof retryBootstrap;
  loginWithGoogle?: () => Promise<void>;
  completeTwoFactorSession?: typeof completeTwoFactorSession;
  verifyTwoFactor?: typeof verifyTwoFactor;
  getPendingTwoFactor?: () => { token: string; user: AuthUser; expiresIn?: number } | null;
  savePendingTwoFactor?: (data: { token: string; user: AuthUser; expiresIn?: number }) => void;
  clearPendingTwoFactor?: () => void;
}

const sessionActions: AuthFormActions = {
  loginWithCredentials,
  signupWithCredentials,
  logout,
  backToLogin,
  retryBootstrap,
  completeTwoFactorSession,
  verifyTwoFactor,
};

/** Lo que llega a los handlers: el evento del <form> en la web; nada en mobile. */
type FormSubmit = { preventDefault(): void } | undefined;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;

export type AuthTab = 'login' | 'register' | 'forgot' | '2fa';

/** Campo al que corresponde el error; sin campo, el error es del formulario (p. ej. credenciales). */
export type AuthField = 'username' | 'email' | 'password' | 'confirm';

/** Mismo texto exista o no la cuenta (CA4): no depende de la respuesta del backend. */
export const PASSWORD_RESET_SENT_MESSAGE =
  'Si el correo está registrado, vas a recibir un enlace para elegir una contraseña nueva. ' +
  'El enlace vence en 1 hora y sirve una sola vez.';

/** Normaliza lo que se tipea en un nombre de usuario: minúsculas y caracteres permitidos. */
export const sanitizeUsername = (value: string) => value.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_');

/** Mensaje para el formulario de recupero de contraseña (lo usan la web y el backoffice). */
export function describePasswordResetError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      if (err.retryAfterSeconds) {
        const minutes = Math.max(1, Math.ceil(err.retryAfterSeconds / 60));
        return `Hiciste demasiados pedidos de recupero. Probá de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
      }
      return 'Hiciste demasiados pedidos de recupero. Probá de nuevo en unos minutos.';
    }
    if (err.status === 422) {
      return 'El formato del correo electrónico no es válido.';
    }
  }
  return 'No pudimos procesar el pedido. Intentá de nuevo en unos minutos.';
}

export function useAuthForms(authService: AuthFormActions = sessionActions) {
  const { pendingEmail, error: sessionError, pendingTwoFactor: sessionPendingTwoFactor } = useSession();

  // Tab activo: 'login', 'register' o 'forgot' (recupero de contraseña) o '2fa' (segundo factor)
  const [activeTab, setActiveTab] = useState<AuthTab>(() => {
    return (sessionPendingTwoFactor || authService.getPendingTwoFactor?.()) ? '2fa' : 'login';
  });

  // Campos de Iniciar Sesión
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Campos de Registro
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Campos de Recupero de contraseña
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Estados de carga y error del formulario
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [formError, setFormErrorState] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<AuthField | null>(null);

  // CA 3: Reflejar errores de sesión (ej: proveedor externo no disponible tras callback)
  useEffect(() => {
    if (sessionError?.message) {
      setFormErrorState(sessionError.message);
    }
  }, [sessionError?.message]);

  // Estados locales para el caso de resolución de conflicto de username (needs_profile)
  const [conflictUsername, setConflictUsername] = useState('');
  const [conflictDisplayName, setConflictDisplayName] = useState('');
  const [isSubmittingConflict, setIsSubmittingConflict] = useState(false);
  const [conflictError, setConflictErrorState] = useState<string | null>(null);

  // Estados para verificación de segundo factor (2FA) (CA 2, CA 3, CA 4)
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [isSubmittingTwoFactor, setIsSubmittingTwoFactor] = useState(false);
  const [recoveryCodeNotice, setRecoveryCodeNotice] = useState(false);
  const [pendingTwoFactor, setPendingTwoFactor] = useState<{
    token: string;
    user: AuthUser;
    expiresIn?: number;
  } | null>(() => {
    return sessionPendingTwoFactor ?? authService.getPendingTwoFactor?.() ?? null;
  });

  useEffect(() => {
    const pending = sessionPendingTwoFactor || authService.getPendingTwoFactor?.();
    if (pending) {
      setPendingTwoFactor(pending);
      setActiveTab('2fa');
      setTwoFactorError(null);
      setIsSubmittingGoogle(false);
      setIsSubmitting(false);
    }
  }, [sessionPendingTwoFactor, authService]);

  const setFormError = (message: string | null, field: AuthField | null = null) => {
    setFormErrorState(message);
    setErrorField(message ? field : null);
  };

  const setConflictError = (message: string | null, field: AuthField | null = null) => {
    setConflictErrorState(message);
    setErrorField(message ? field : null);
  };

  // Reglas de contraseña para feedback visual en tiempo real
  const passwordRules = {
    length: regPassword.length >= 8,
    upper: /[A-Z]/.test(regPassword),
    lower: /[a-z]/.test(regPassword),
    number: /[0-9]/.test(regPassword),
  };

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setFormError(null);
  };

  const openForgot = (email: string) => {
    setActiveTab('forgot');
    setForgotEmail(email);
    setForgotSent(false);
    setFormError(null);
  };

  const backToLoginTab = () => {
    setActiveTab('login');
    setFormError(null);
    setTwoFactorError(null);
    setTwoFactorCode('');
    setPendingTwoFactor(null);
    setIsSubmittingGoogle(false);
    setIsSubmitting(false);
    useSession.setState({ pendingTwoFactor: null });
    authService.clearPendingTwoFactor?.();
  };

  const handleForgotSubmit = async (e?: FormSubmit) => {
    e?.preventDefault();
    setFormError(null);

    const email = forgotEmail.trim();
    if (!email || !EMAIL_REGEX.test(email)) {
      setFormError('El formato del correo electrónico no es válido.', 'email');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setForgotSent(true);
    } catch (err) {
      setFormError(describePasswordResetError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e?: FormSubmit) => {
    e?.preventDefault();
    setFormError(null);

    const email = loginEmail.trim();
    const password = loginPassword;

    // Validación básica en cliente
    if (!email || !EMAIL_REGEX.test(email) || !password) {
      // CA 2 & CA 3 Login: error genérico sin revelar qué campo falló
      setFormError('El correo electrónico o la contraseña son incorrectos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.loginWithCredentials({
        email,
        password,
      });
    } catch (err) {
      if (err instanceof TwoFactorRequiredError) {
        const pending = {
          token: err.pendingToken,
          user: err.pendingUser as AuthUser,
          expiresIn: err.pendingExpiresIn,
        };
        authService.savePendingTwoFactor?.(pending);
        useSession.setState({ pendingTwoFactor: pending });
        setPendingTwoFactor(pending);
        setActiveTab('2fa');
        setTwoFactorCode('');
        setTwoFactorError(null);
        setIsSubmittingGoogle(false);
        setIsSubmitting(false);
        return;
      }
      const msg = err instanceof Error ? err.message : '';
      if (err instanceof AuthNetworkError) {
        // Sin respuesta de Auth0: no es un problema de credenciales
        setFormError(err.message);
      } else if (err instanceof AccountSuspendedError || msg.includes('access_denied')) {
        setFormError('Tu cuenta se encuentra suspendida.');
      } else {
        // CA 2 & CA 3 Login: error genérico
        setFormError('El correo electrónico o la contraseña son incorrectos.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Envía el código TOTP o código de recuperación para completar el login 2FA (CA 2, CA 3, CA 4). */
  const handleTwoFactorSubmit = async (e?: FormSubmit) => {
    e?.preventDefault();
    setTwoFactorError(null);

    const cleanCode = twoFactorCode.trim();
    if (!cleanCode) {
      setTwoFactorError('Ingresá el código de verificación.');
      return;
    }

    if (!pendingTwoFactor) {
      setTwoFactorError('La sesión expiró. Volvé a ingresar tus credenciales.');
      return;
    }

    setIsSubmittingTwoFactor(true);
    try {
      const verifyFn = authService.verifyTwoFactor || verifyTwoFactor;
      const result = await verifyFn(cleanCode, pendingTwoFactor.token);
      if (result.valid) {
        if (result.recovery_code_used) {
          setRecoveryCodeNotice(true);
        }
        authService.clearPendingTwoFactor?.();
        useSession.setState({ pendingTwoFactor: null });
        const fn = authService.completeTwoFactorSession || completeTwoFactorSession;
        await fn(pendingTwoFactor.token, pendingTwoFactor.user, pendingTwoFactor.expiresIn);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setTwoFactorError('Código de verificación incorrecto o expirado.');
      } else {
        setTwoFactorError(errorDetail(err) || 'Código de verificación incorrecto o expirado.');
      }
    } finally {
      setIsSubmittingTwoFactor(false);
    }
  };

  const handleRegisterSubmit = async (e?: FormSubmit) => {
    e?.preventDefault();
    setFormError(null);

    const username = regUsername.trim().toLowerCase();
    const email = regEmail.trim();
    const password = regPassword;
    const confirmPassword = regConfirmPassword;

    // Validación de Username
    if (!username || !USERNAME_REGEX.test(username)) {
      setFormError(
        'El nombre de usuario debe tener entre 3 y 32 caracteres (solo letras, números, guiones o puntos).',
        'username'
      );
      return;
    }

    // CA 3: Formato de email inválido
    if (!email || !EMAIL_REGEX.test(email)) {
      setFormError('El formato del correo electrónico no es válido.', 'email');
      return;
    }

    // CA 4: Contraseña insegura (mínimo 8 caracteres, mayúscula, minúscula, número)
    if (!passwordRules.length || !passwordRules.upper || !passwordRules.lower || !passwordRules.number) {
      setFormError('La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula y número.', 'password');
      return;
    }

    // Coincidencia de contraseñas
    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.', 'confirm');
      return;
    }

    setIsSubmitting(true);
    try {
      // CA 1: Registro exitoso con datos válidos -> Crea la cuenta y accede a la plataforma
      await authService.signupWithCredentials({
        email,
        password,
        username,
        displayName: username,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // CA 2: Email o nombre de usuario ya registrado
      if (err instanceof SignupConflictError) {
        setFormError(err.message, err.field);
      } else if (err instanceof AuthNetworkError) {
        setFormError(err.message);
      } else if (
        msg.toLowerCase().includes('en uso') ||
        msg.toLowerCase().includes('already in use') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('invalid sign up') ||
        msg.toLowerCase().includes('invalid_signup') ||
        msg.toLowerCase().includes('user_exists')
      ) {
        setFormError('El correo o nombre de usuario ya está en uso.');
      } else if (msg.toLowerCase().includes('requisitos de seguridad') || msg.toLowerCase().includes('password')) {
        // CA 4: Indicación de requisitos de contraseña si Auth0 tenant impone una política superior
        setFormError(msg, 'password');
      } else {
        setFormError(msg || 'Error al procesar el registro.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConflictSubmit = async (e?: FormSubmit) => {
    e?.preventDefault();
    setConflictError(null);

    const cleanUser = conflictUsername.trim().toLowerCase();
    if (!cleanUser || !USERNAME_REGEX.test(cleanUser)) {
      setConflictError('El nombre de usuario debe tener entre 3 y 32 caracteres alfanuméricos.', 'username');
      return;
    }

    setIsSubmittingConflict(true);
    try {
      await upsertMyProfile({
        username: cleanUser,
        display_name: conflictDisplayName.trim() || cleanUser,
      });
      await authService.retryBootstrap();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError('Ese nombre de usuario ya está ocupado por otra persona. Por favor elige otro.', 'username');
      } else {
        setConflictError(errorDetail(err) || 'Error al guardar el perfil.');
      }
    } finally {
      setIsSubmittingConflict(false);
    }
  };

  /** Email sin verificar: "ya lo verifiqué" vuelve al login con el email precargado. */
  const handleVerifiedRetry = () => {
    // La contraseña no se guarda en ningún lado: el usuario la vuelve a ingresar.
    setActiveTab('login');
    setLoginEmail(pendingEmail ?? loginEmail);
    setLoginPassword('');
    setFormError(null);
    authService.backToLogin();
  };

  const handleUseOtherAccount = async () => {
    setActiveTab('login');
    setLoginEmail('');
    setLoginPassword('');
    setFormError(null);
    await authService.logout();
  };

  /** Inicia login federado con Google (CA 1, CA 2). Si falla, informa el error y ofrece email/password (CA 3). */
  const handleGoogleLogin = async () => {
    setFormError(null);
    setIsSubmittingGoogle(true);
    try {
      if (authService.loginWithGoogle) {
        await authService.loginWithGoogle();
      } else {
        throw new Error('Federated login not available');
      }
    } catch {
      setFormError('El proveedor externo no está disponible o no respondió. Podés iniciar sesión con correo y contraseña.');
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  return {
    activeTab,
    switchTab,
    openForgot,
    backToLoginTab,
    login: { email: loginEmail, setEmail: setLoginEmail, password: loginPassword, setPassword: setLoginPassword },
    register: {
      username: regUsername,
      setUsername: setRegUsername,
      email: regEmail,
      setEmail: setRegEmail,
      password: regPassword,
      setPassword: setRegPassword,
      confirmPassword: regConfirmPassword,
      setConfirmPassword: setRegConfirmPassword,
      passwordRules,
    },
    forgot: { email: forgotEmail, setEmail: setForgotEmail, sent: forgotSent },
    conflict: {
      username: conflictUsername,
      setUsername: setConflictUsername,
      displayName: conflictDisplayName,
      setDisplayName: setConflictDisplayName,
      isSubmitting: isSubmittingConflict,
      error: conflictError,
    },
    twoFactor: {
      code: twoFactorCode,
      setCode: setTwoFactorCode,
      error: twoFactorError,
      isSubmitting: isSubmittingTwoFactor,
      recoveryCodeNotice,
      cancel: backToLoginTab,
    },
    isSubmitting,
    isSubmittingGoogle,
    formError,
    errorField,
    handleLoginSubmit,
    handleTwoFactorSubmit,
    handleRegisterSubmit,
    handleForgotSubmit,
    handleConflictSubmit,
    handleVerifiedRetry,
    handleUseOtherAccount,
    handleGoogleLogin,
  };
}

export type AuthForms = ReturnType<typeof useAuthForms>;
