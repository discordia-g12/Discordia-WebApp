import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertCircle,
  Loader2,
  Sparkles,
  LogIn,
  UserPlus,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  Check,
  X,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { useSession, authService } from '../../../platform/auth/session';
import { PASSWORD_RESET_SENT_MESSAGE, sanitizeUsername, type AuthForms } from '@discordia/core';
import styles from './LegacyAuthView.module.css';

/**
 * Pantalla de acceso del diseño anterior (sin el flag del rediseño). La lógica de los formularios es
 * la de useAuthForms, compartida con AuthScreen. Se borra en el paso 14 de docs/TODO-REDISENO.md.
 */
export const LegacyAuthView: React.FC<{ forms: AuthForms }> = ({ forms }) => {
  const { status, error, isMock, pendingEmail } = useSession();
  const {
    activeTab,
    switchTab,
    openForgot,
    backToLoginTab,
    isSubmitting,
    formError,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleForgotSubmit,
    handleConflictSubmit,
    handleVerifiedRetry,
    handleUseOtherAccount,
  } = forms;
  const { email: loginEmail, setEmail: setLoginEmail, password: loginPassword, setPassword: setLoginPassword } = forms.login;
  const {
    username: regUsername,
    setUsername: setRegUsername,
    email: regEmail,
    setEmail: setRegEmail,
    password: regPassword,
    setPassword: setRegPassword,
    confirmPassword: regConfirmPassword,
    setConfirmPassword: setRegConfirmPassword,
  } = forms.register;
  const { length: passLength, upper: passUpper, lower: passLower, number: passNumber } = forms.register.passwordRules;
  const { email: forgotEmail, setEmail: setForgotEmail, sent: forgotSent } = forms.forgot;
  const {
    username: conflictUsername,
    setUsername: setConflictUsername,
    displayName: conflictDisplayName,
    setDisplayName: setConflictDisplayName,
    isSubmitting: isSubmittingConflict,
    error: conflictError,
  } = forms.conflict;

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // 1. Estado: Bootstrapping / Verificando sesión
  if (status === 'bootstrapping') {
    return (
      <div className="auth-container" style={fullScreenCenter}>
        <div style={cardStyle}>
          <div className={styles.div}>
            <Loader2 className="animate-spin" size={42} color="var(--brand, #5865f2)" style={{ margin: '0 auto 16px' }} />
            <h2 className={styles.verificandoSesion}>
              Verificando sesión...
            </h2>
            <p className={styles.p}>
              Cargando tu perfil e información de Discordia.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Estado: Error recuperable con botón de reintento
  if (status === 'error') {
    return (
      <div className="auth-container" style={fullScreenCenter}>
        <div style={cardStyle}>
          <div className={styles.div2}>
            <div style={{ ...iconCircle, backgroundColor: 'rgba(237, 66, 69, 0.15)', color: 'var(--legacy-red)' }}>
              <AlertCircle size={32} />
            </div>
            <h2 className={styles.h2}>
              {error?.title || 'Error'}
            </h2>
            <p className={styles.p2}>
              {error?.message || 'Ocurrió un error al procesar tu cuenta.'}
            </p>
            {error?.detail && (
              <p className={styles.p3}>
                {error.detail}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => authService.retryBootstrap()}
            style={{ ...primaryButton, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // 3. Estado: Cuenta Suspendida
  if (status === 'suspended') {
    return (
      <div className="auth-container" style={fullScreenCenter}>
        <div style={cardStyle}>
          <div className={styles.div2}>
            <div style={{ ...iconCircle, backgroundColor: 'rgba(237, 66, 69, 0.2)', color: 'var(--legacy-red)' }}>
              <ShieldAlert size={36} />
            </div>
            <h2 className={styles.cuentaSuspendida}>
              Cuenta Suspendida
            </h2>
            <p className={styles.p4}>
              Tu cuenta ha sido suspendida temporal o permanentemente por el equipo de moderación.
            </p>
          </div>

          <button
            type="button"
            onClick={() => authService.logout()}
            style={{ ...secondaryButton, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // 4. Estado: Email sin verificar (la Auth0 Action rechazó el login hasta que se confirme el email)
  if (status === 'email_unverified') {
    return (
      <div className="auth-container" style={fullScreenCenter}>
        <div style={cardStyle} data-testid="email-unverified-screen">
          <div className={styles.div2}>
            <div style={{ ...iconCircle, backgroundColor: 'rgba(88, 101, 242, 0.15)', color: 'var(--brand, #5865f2)' }}>
              <Mail size={32} />
            </div>
            <h2 className={styles.cuentaSuspendida}>
              Verificá tu email
            </h2>
            <p className={styles.p4}>
              {pendingEmail ? (
                <>
                  Te enviamos un enlace de verificación a <strong>{pendingEmail}</strong>.
                </>
              ) : (
                'Te enviamos un enlace de verificación a tu casilla de correo.'
              )}{' '}
              Abrilo para activar tu cuenta y después volvé a iniciar sesión.
            </p>
            <p className={styles.p5}>
              ¿No lo encontrás? Revisá la carpeta de spam o correo no deseado.
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-verified-retry"
            onClick={handleVerifiedRetry}
            style={{ ...primaryButton, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}
          >
            <LogIn size={16} />
            Ya lo verifiqué, iniciar sesión
          </button>
          <button
            type="button"
            data-testid="btn-use-other-account"
            onClick={handleUseOtherAccount}
            style={{ ...secondaryButton, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <LogOut size={16} />
            Usar otra cuenta
          </button>
        </div>
      </div>
    );
  }

  // 5. Estado: Conflicto de Username (needs_profile) tras auto-aprovisionamiento 409
  if (status === 'needs_profile') {
    return (
      <div className="auth-container" style={fullScreenCenter}>
        <div style={cardStyle}>
          <div className={styles.div2}>
            <div style={{ ...iconCircle, backgroundColor: 'rgba(88, 101, 242, 0.15)', color: 'var(--brand, #5865f2)' }}>
              <Sparkles size={32} />
            </div>
            <h2 className={styles.cuentaSuspendida}>
              Elige tu Nombre de Usuario
            </h2>
            <p className={styles.p}>
              Tu cuenta fue autenticada, pero el nombre de usuario ya está en uso. Elige uno disponible:
            </p>
          </div>

          {conflictError && (
            <div style={errorAlertStyle}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{conflictError}</span>
            </div>
          )}

          <form onSubmit={handleConflictSubmit}>
            <div className={styles.div3}>
              <label style={labelStyle}>
                NOMBRE DE USUARIO <span className={styles.span}>*</span>
              </label>
              <input
                type="text"
                value={conflictUsername}
                onChange={(e) => setConflictUsername(sanitizeUsername(e.target.value))}
                placeholder="ej: alexr_2026"
                style={inputStyle}
                disabled={isSubmittingConflict}
                autoFocus
              />
            </div>

            <div className={styles.div4}>
              <label style={labelStyle}>NOMBRE PÚBLICO (OPCIONAL)</label>
              <input
                type="text"
                value={conflictDisplayName}
                onChange={(e) => setConflictDisplayName(e.target.value)}
                placeholder="ej: Alex Rivera"
                style={inputStyle}
                disabled={isSubmittingConflict}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingConflict}
              style={{
                ...primaryButton,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSubmittingConflict ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Entrar a Discordia</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 6. Estado: Sin sesión (unauthenticated) -> Formulario integrado de Iniciar Sesión / Registro
  return (
    <div className="auth-container" style={fullScreenCenter}>
      {isMock && (
        <div style={mockBannerStyle}>
          ⚠️ <strong>MODO MOCK ACTIVO (DEV)</strong>: Autenticación simulada en memoria.
        </div>
      )}

      <div style={cardStyle}>
        {/* Encabezado */}
        <div className={styles.encabezado}>
          <div className={styles.encabezadoDiv}>
            <Sparkles size={28} color="#ffffff" />
          </div>
          <h1 className={styles.encabezadoH1}>
            {activeTab === 'login'
              ? 'Bienvenido de nuevo'
              : activeTab === 'register'
                ? 'Crear una cuenta'
                : 'Recuperar contraseña'}
          </h1>
          <p className={styles.encabezadoP}>
            {activeTab === 'login'
              ? '¡Nos alegra verte otra vez!'
              : activeTab === 'register'
                ? '¡Comenzá a conversar y compartir con tu comunidad!'
                : 'Ingresá tu correo y te enviamos un enlace para elegir una contraseña nueva.'}
          </p>
        </div>

        {/* Pestañas de Selección (ocultas en el recupero de contraseña) */}
        {activeTab !== 'forgot' && (
        <div style={tabsContainerStyle} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            data-testid="tab-login"
            onClick={() => switchTab('login')}
            style={{
              ...tabButtonStyle,
              borderBottom: activeTab === 'login' ? '2px solid var(--brand, #5865f2)' : '2px solid transparent',
              color: activeTab === 'login' ? 'var(--text-white)' : 'var(--text-muted)',
              fontWeight: activeTab === 'login' ? 700 : 500,
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'register'}
            data-testid="tab-register"
            onClick={() => switchTab('register')}
            style={{
              ...tabButtonStyle,
              borderBottom: activeTab === 'register' ? '2px solid var(--brand, #5865f2)' : '2px solid transparent',
              color: activeTab === 'register' ? 'var(--text-white)' : 'var(--text-muted)',
              fontWeight: activeTab === 'register' ? 700 : 500,
            }}
          >
            Registrarse
          </button>
        </div>
        )}

        {formError && (
          <div style={errorAlertStyle}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{formError}</span>
          </div>
        )}

        {/* Formulario según la pestaña activa */}
        {activeTab === 'forgot' ? (
          forgotSent ? (
            <div data-testid="forgot-sent">
              <div style={successAlertStyle} role="status">
                <Mail size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{PASSWORD_RESET_SENT_MESSAGE}</span>
              </div>
              <p className={styles.p6}>
                ¿No lo encontrás? Revisá la carpeta de spam o correo no deseado.
              </p>
              <button
                type="button"
                data-testid="btn-forgot-back-to-login"
                onClick={backToLoginTab}
                style={{ ...secondaryButton, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <ArrowLeft size={16} />
                Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} noValidate>
              <div className={styles.div5}>
                <label style={labelStyle}>
                  CORREO ELECTRÓNICO <span className={styles.span}>*</span>
                </label>
                <div style={inputWrapperStyle}>
                  <Mail size={16} color="#949ba4" style={{ marginRight: '8px' }} />
                  <input
                    type="email"
                    data-testid="input-forgot-email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="ejemplo@discordia.com"
                    style={innerInputStyle}
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="btn-submit-forgot"
                disabled={isSubmitting}
                style={{
                  ...primaryButton,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '15px',
                  marginBottom: '12px',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={18} />
                    <span>Enviar enlace</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="btn-forgot-back-to-login"
                onClick={backToLoginTab}
                disabled={isSubmitting}
                style={{ ...linkButtonStyle, display: 'block', margin: '0 auto' }}
              >
                Volver a iniciar sesión
              </button>
            </form>
          )
        ) : activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <div className={styles.div3}>
              <label style={labelStyle}>
                CORREO ELECTRÓNICO <span className={styles.span}>*</span>
              </label>
              <div style={inputWrapperStyle}>
                <Mail size={16} color="#949ba4" style={{ marginRight: '8px' }} />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ejemplo@discordia.com"
                  style={innerInputStyle}
                  disabled={isSubmitting}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className={styles.div5}>
              <label style={labelStyle}>
                CONTRASEÑA <span className={styles.span}>*</span>
              </label>
              <div style={inputWrapperStyle}>
                <Lock size={16} color="#949ba4" style={{ marginRight: '8px' }} />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  style={innerInputStyle}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  style={eyeButtonStyle}
                  aria-label="Alternar visibilidad de contraseña"
                >
                  {showLoginPassword ? <EyeOff size={16} color="#949ba4" /> : <Eye size={16} color="#949ba4" />}
                </button>
              </div>
              <div className={styles.div6}>
                <button
                  type="button"
                  data-testid="link-forgot-password"
                  onClick={() => openForgot(loginEmail.trim())}
                  disabled={isSubmitting}
                  style={linkButtonStyle}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="btn-submit-login"
              disabled={isSubmitting}
              style={{
                ...primaryButton,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '15px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <div className={styles.div7}>
              <label style={labelStyle}>
                NOMBRE DE USUARIO <span className={styles.span}>*</span>
              </label>
              <div style={inputWrapperStyle}>
                <UserIcon size={16} color="#949ba4" style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(sanitizeUsername(e.target.value))}
                  placeholder="ej: alexr"
                  style={innerInputStyle}
                  disabled={isSubmitting}
                  minLength={3}
                  maxLength={32}
                  required
                />
              </div>
              <p className={styles.p7}>
                Tu nombre de usuario único en Discordia (mínimo 3 caracteres alfanuméricos).
              </p>
            </div>


            <div className={styles.div7}>
              <label style={labelStyle}>
                CORREO ELECTRÓNICO <span className={styles.span}>*</span>
              </label>
              <div style={inputWrapperStyle}>
                <Mail size={16} color="#949ba4" style={{ marginRight: '8px' }} />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ejemplo@discordia.com"
                  style={innerInputStyle}
                  disabled={isSubmitting}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className={styles.div8}>
              <label style={labelStyle}>
                CONTRASEÑA <span className={styles.span}>*</span>
              </label>
              <div style={inputWrapperStyle}>
                <Lock size={16} color="#949ba4" style={{ marginRight: '8px' }} />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={innerInputStyle}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword((v) => !v)}
                  style={eyeButtonStyle}
                  aria-label="Alternar visibilidad"
                >
                  {showRegPassword ? <EyeOff size={16} color="#949ba4" /> : <Eye size={16} color="#949ba4" />}
                </button>
              </div>

              {/* Indicadores de requisitos de contraseña (CA 4) */}
              <div className={styles.indicadoresRequisitosContrasenaCa}>
                <span className={styles.indicadoresRequisitosContrasenaCaSpan} style={{ color: passLength ? 'var(--status-online)' : 'var(--text-muted)' }}>
                  {passLength ? <Check size={12} /> : <X size={12} />} Mínimo 8 caracteres
                </span>
                <span className={styles.indicadoresRequisitosContrasenaCaSpan} style={{ color: passUpper && passLower ? 'var(--status-online)' : 'var(--text-muted)' }}>
                  {passUpper && passLower ? <Check size={12} /> : <X size={12} />} Mayúsculas y minúsculas
                </span>
                <span className={styles.indicadoresRequisitosContrasenaCaSpan} style={{ color: passNumber ? 'var(--status-online)' : 'var(--text-muted)' }}>
                  {passNumber ? <Check size={12} /> : <X size={12} />} Al menos un número
                </span>
              </div>
            </div>

            <div className={styles.div5}>
              <label style={labelStyle}>
                CONFIRMAR CONTRASEÑA <span className={styles.span}>*</span>
              </label>
              <div style={inputWrapperStyle}>
                <Lock size={16} color="#949ba4" style={{ marginRight: '8px' }} />
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  style={innerInputStyle}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword((v) => !v)}
                  style={eyeButtonStyle}
                  aria-label="Alternar visibilidad"
                >
                  {showRegConfirmPassword ? <EyeOff size={16} color="#949ba4" /> : <Eye size={16} color="#949ba4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="btn-submit-register"
              disabled={isSubmitting}
              style={{
                ...primaryButton,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '15px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Crear Cuenta y Entrar</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ==========================================
// Estilos Inline
// ==========================================

const fullScreenCenter: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: '#1e1f22',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '440px',
  backgroundColor: '#313338',
  borderRadius: '12px',
  padding: '28px 32px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
};

const tabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  marginBottom: '18px',
};

const tabButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 0',
  fontSize: '14px',
  textAlign: 'center',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  transition: 'all 0.15s ease',
};

const iconCircle: React.CSSProperties = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#b5bac1',
  marginBottom: '6px',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
};

const inputWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#1e1f22',
  border: '1px solid rgba(0, 0, 0, 0.3)',
  borderRadius: '4px',
  padding: '0 12px',
};

const innerInputStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: 'transparent',
  border: 'none',
  padding: '10px 0',
  color: '#f2f3f5',
  fontSize: '14px',
  outline: 'none',
};

const eyeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1e1f22',
  border: '1px solid transparent',
  borderRadius: '4px',
  padding: '10px 12px',
  color: '#f2f3f5',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryButton: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--brand, #5865f2)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  padding: '12px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

const secondaryButton: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#4e5058',
  color: '#ffffff',
  border: 'none',
  borderRadius: '4px',
  padding: '12px 16px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

const errorAlertStyle: React.CSSProperties = {
  backgroundColor: 'rgba(237, 66, 69, 0.15)',
  border: '1px solid #ed4245',
  borderRadius: '4px',
  padding: '10px 14px',
  color: '#fa777c',
  fontSize: '13px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  marginBottom: '16px',
};

const successAlertStyle: React.CSSProperties = {
  backgroundColor: 'rgba(35, 165, 90, 0.15)',
  border: '1px solid #23a55a',
  borderRadius: '4px',
  padding: '10px 14px',
  color: '#57d68d',
  fontSize: '13px',
  lineHeight: 1.5,
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  marginBottom: '16px',
};

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: '#00a8fc',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
};

const mockBannerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  backgroundColor: '#f0b232',
  color: '#000000',
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 600,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};