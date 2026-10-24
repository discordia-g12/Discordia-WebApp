import { useState } from 'react';
import { ApiError } from '../api/errors';
import { requestPasswordReset } from '../api/passwordReset';
import { upsertMyProfile } from '../api/users';
import { AccountSuspendedError } from './errors';
import { backToLogin, loginWithCredentials, logout, retryBootstrap, signupWithCredentials, useSession } from './session';

/**
 * Estado y reglas de los formularios de acceso (login, registro, recupero de contraseña y elección de
 * nombre de usuario). Lo usan la web (AuthScreen y la vista anterior) y mobile, así las validaciones y
 * los mensajes son los mismos en todas.
 */

/** Acciones de la sesión que usan los formularios. La web pasa su authService (los tests lo espían). */
export interface AuthFormActions {
  loginWithCredentials: typeof loginWithCredentials;
  signupWithCredentials: typeof signupWithCredentials;
  logout: typeof logout;
  backToLogin: typeof backToLogin;
  retryBootstrap: typeof retryBootstrap;
}

const sessionActions: AuthFormActions = { loginWithCredentials, signupWithCredentials, logout, backToLogin, retryBootstrap };

/** Lo que llega a los handlers: el evento del <form> en la web; nada en mobile. */
type FormSubmit = { preventDefault(): void } | undefined;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;

export type AuthTab = 'login' | 'register' | 'forgot';

/** Campo al que corresponde el error; sin campo, el error es del formulario (p. ej. credenciales). */
export type AuthField = 'username' | 'email' | 'password' | 'confirm';

/** Mismo texto exista o no la cuenta (CA4): no depende de la respuesta del backend. */
export const PASSWORD_RESET_SENT_MESSAGE =
  'Si el correo está registrado, vas a recibir un enlace para elegir una contraseña nueva. ' +
  'El enlace vence en 1 hora y sirve una sola vez.';

/** Normaliza lo que se tipea en un nombre de usuario: minúsculas y caracteres permitidos. */
export const sanitizeUsername = (value: string) => value.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_');

function describePasswordResetError(err: unknown): string {
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
  const { pendingEmail } = useSession();

  // Tab activo: 'login', 'register' o 'forgot' (recupero de contraseña)
  const [activeTab, setActiveTab] = useState<AuthTab>('login');

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
  const [formError, setFormErrorState] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<AuthField | null>(null);

  // Estados locales para el caso de resolución de conflicto de username (needs_profile)
  const [conflictUsername, setConflictUsername] = useState('');
  const [conflictDisplayName, setConflictDisplayName] = useState('');
  const [isSubmittingConflict, setIsSubmittingConflict] = useState(false);
  const [conflictError, setConflictErrorState] = useState<string | null>(null);

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
    } catch (err: any) {
      const msg = err?.message || '';
      if (err instanceof AccountSuspendedError || msg.includes('access_denied')) {
        setFormError('Tu cuenta se encuentra suspendida.');
      } else {
        // CA 2 & CA 3 Login: error genérico
        setFormError('El correo electrónico o la contraseña son incorrectos.');
      }
    } finally {
      setIsSubmitting(false);
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
    } catch (err: any) {
      const msg = String(err?.message || '');
      // CA 2: Email o nombre de usuario ya registrado
      if (
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
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError('Ese nombre de usuario ya está ocupado por otra persona. Por favor elige otro.', 'username');
      } else {
        setConflictError(err?.detail || err?.message || 'Error al guardar el perfil.');
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
    isSubmitting,
    formError,
    errorField,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleForgotSubmit,
    handleConflictSubmit,
    handleVerifiedRetry,
    handleUseOtherAccount,
  };
}

export type AuthForms = ReturnType<typeof useAuthForms>;
