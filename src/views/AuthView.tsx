import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { AuthScreen, User } from '../types';
import { USERS, CURRENT_USER_ID } from '../data/mock';

export interface AuthViewProps {
  initialScreen?: AuthScreen;
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialScreen = 'login',
  onSuccess,
  onCancel,
}) => {
  const [screen, setScreen] = useState<AuthScreen>(initialScreen);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [loginEmail, setLoginEmail] = useState('alex.rivera@discordia.gg');
  const [loginPassword, setLoginPassword] = useState('SuperSecret2026!');

  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState(['', '', '', '', '', '']);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleNavigate = (newScreen: AuthScreen) => {
    clearMessages();
    setScreen(newScreen);
  };

  // Login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Check if user has 2FA enabled in mock data
      const foundUser = Object.values(USERS).find(
        (u) => u.email?.toLowerCase() === loginEmail.toLowerCase()
      ) || USERS[CURRENT_USER_ID];

      if (foundUser?.twoFactorEnabled) {
        setScreen('2fa');
      } else {
        onSuccess?.(foundUser);
      }
    }, 900);
  };

  // Google OAuth simulation
  const handleGoogleLogin = () => {
    clearMessages();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user = USERS[CURRENT_USER_ID];
      onSuccess?.(user);
    }, 1100);
  };

  // Register handler
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!registerUsername.trim()) {
      setErrorMessage('Username is required.');
      return;
    }
    if (!registerEmail.trim() || !registerEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    if (registerPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('You must accept the Terms of Service to continue.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const newUser: User = {
        id: `u-${Date.now()}`,
        username: registerUsername.toLowerCase().replace(/\s+/g, '_'),
        displayName: registerUsername,
        email: registerEmail,
        status: 'online',
        points: 100,
        createdAt: new Date().toISOString(),
        bio: '¡Hola! Acabo de unirme a Discordia.',
        bannerColor: '#5865f2',
      };
      setSuccessMessage('Account created successfully! Welcome to Discordia.');
      setTimeout(() => {
        onSuccess?.(newUser);
      }, 700);
    }, 1200);
  };

  // Forgot password handler
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage(
        `Instructions to reset your password have been dispatched to ${forgotEmail}. Please check your inbox!`
      );
    }, 1000);
  };

  // 2FA digit change
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...twoFactorCode];
    newCode[index] = value.slice(-1);
    setTwoFactorCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`2fa-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !twoFactorCode[index] && index > 0) {
      const prevInput = document.getElementById(`2fa-digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setTwoFactorCode(digits);
      const lastInput = document.getElementById('2fa-digit-5');
      lastInput?.focus();
    }
  };

  // 2FA Submit handler
  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (useBackupCode) {
      if (!backupCode.trim() || backupCode.trim().length < 8) {
        setErrorMessage('Backup codes are 8 alphanumeric characters.');
        return;
      }
    } else {
      const code = twoFactorCode.join('');
      if (code.length !== 6) {
        setErrorMessage('Please enter all 6 digits of your authenticator code.');
        return;
      }
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user = USERS[CURRENT_USER_ID];
      setSuccessMessage('Two-Factor Authentication verified successfully!');
      setTimeout(() => {
        onSuccess?.(user);
      }, 600);
    }, 1000);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#1e1f22',
        backgroundImage:
          'radial-gradient(circle at 15% 15%, rgba(88, 101, 242, 0.15) 0%, transparent 40%), radial-gradient(circle at 85% 85%, rgba(235, 69, 158, 0.12) 0%, transparent 45%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* Optional Cancel/Back button if provided */}
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(43, 45, 49, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#dbdee1',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            backdropFilter: 'blur(8px)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(78, 80, 88, 0.7)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(43, 45, 49, 0.7)')}
        >
          <ArrowLeft size={16} />
          Back to App
        </button>
      )}

      {/* Main Auth Card */}
      <div
        style={{
          width: '100%',
          maxWidth: screen === 'register' ? '480px' : '440px',
          backgroundColor: '#313338',
          borderRadius: 16,
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          padding: '36px 32px',
          boxSizing: 'border-box',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 58,
              height: 58,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #5865f2 0%, #7289da 100%)',
              boxShadow: '0 8px 20px rgba(88, 101, 242, 0.4)',
              marginBottom: 16,
            }}
          >
            <Sparkles size={30} color="#ffffff" />
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#f2f3f5',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {screen === 'login' && 'Welcome back!'}
            {screen === 'register' && 'Create an account'}
            {screen === 'forgot' && 'Reset your password'}
            {screen === '2fa' && 'Two-Factor Authentication'}
          </h1>

          <p style={{ fontSize: 14, color: '#949ba4', margin: 0 }}>
            {screen === 'login' && "We're so excited to see you again!"}
            {screen === 'register' && 'Join the Discordia community today.'}
            {screen === 'forgot' && "Enter your email and we'll send a password recovery link."}
            {screen === '2fa' &&
              (useBackupCode
                ? 'Enter an 8-character backup code generated for your account.'
                : 'Enter the 6-digit code from your authenticator app.')}
          </p>
        </div>

        {/* Global Feedback Messages */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: 'rgba(218, 55, 60, 0.15)',
              border: '1px solid #da373c',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 20,
              color: '#fa777c',
              fontSize: 13,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: 'rgba(35, 165, 90, 0.15)',
              border: '1px solid #23a55a',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 20,
              color: '#2dc770',
              fontSize: 13,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. LOGIN SCREEN */}
        {screen === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                width: '100%',
                padding: '11px 16px',
                backgroundColor: '#ffffff',
                color: '#2e3338',
                borderRadius: 8,
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s, transform 0.1s',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#f2f3f5';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
              <span style={{ padding: '0 12px', fontSize: 11, fontWeight: 700, color: '#949ba4', textTransform: 'uppercase' }}>
                or with email
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            </div>

            {/* Email Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#b5bac1',
                  marginBottom: 6,
                  letterSpacing: '0.02em',
                }}
              >
                Email or Username <span style={{ color: '#da373c' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail
                  size={18}
                  style={{ position: 'absolute', left: 12, color: '#949ba4', pointerEvents: 'none' }}
                />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="alex.rivera@discordia.gg"
                  style={{
                    width: '100%',
                    backgroundColor: '#1e1f22',
                    color: '#dbdee1',
                    border: '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: 6,
                    padding: '10px 12px 10px 38px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#5865f2')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.3)')}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#b5bac1',
                    letterSpacing: '0.02em',
                  }}
                >
                  Password <span style={{ color: '#da373c' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleNavigate('forgot')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00a8fc',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Forgot your password?
                </button>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={18}
                  style={{ position: 'absolute', left: 12, color: '#949ba4', pointerEvents: 'none' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    backgroundColor: '#1e1f22',
                    color: '#dbdee1',
                    border: '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: 6,
                    padding: '10px 40px 10px 38px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#5865f2')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.3)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'none',
                    border: 'none',
                    color: '#949ba4',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign In Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#5865f2',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 6,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#4752c4';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#5865f2';
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Go to Register */}
            <div style={{ fontSize: 13, color: '#949ba4', marginTop: 4 }}>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00a8fc',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Register
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTER SCREEN */}
        {screen === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#b5bac1',
                  marginBottom: 6,
                  letterSpacing: '0.02em',
                }}
              >
                Username <span style={{ color: '#da373c' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <UserIcon
                  size={18}
                  style={{ position: 'absolute', left: 12, color: '#949ba4', pointerEvents: 'none' }}
                />
                <input
                  type="text"
                  required
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  placeholder="e.g. cyber_samurai"
                  style={{
                    width: '100%',
                    backgroundColor: '#1e1f22',
                    color: '#dbdee1',
                    border: '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: 6,
                    padding: '10px 12px 10px 38px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#b5bac1',
                  marginBottom: 6,
                  letterSpacing: '0.02em',
                }}
              >
                Email <span style={{ color: '#da373c' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail
                  size={18}
                  style={{ position: 'absolute', left: 12, color: '#949ba4', pointerEvents: 'none' }}
                />
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="your.email@domain.com"
                  style={{
                    width: '100%',
                    backgroundColor: '#1e1f22',
                    color: '#dbdee1',
                    border: '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: 6,
                    padding: '10px 12px 10px 38px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Password Field with validation helper */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#b5bac1',
                  marginBottom: 6,
                  letterSpacing: '0.02em',
                }}
              >
                Password <span style={{ color: '#da373c' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={18}
                  style={{ position: 'absolute', left: 12, color: '#949ba4', pointerEvents: 'none' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={{
                    width: '100%',
                    backgroundColor: '#1e1f22',
                    color: '#dbdee1',
                    border: '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: 6,
                    padding: '10px 40px 10px 38px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'none',
                    border: 'none',
                    color: '#949ba4',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: registerPassword.length >= 8 ? '#2dc770' : '#949ba4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {registerPassword.length >= 8 ? (
                  <CheckCircle2 size={13} color="#2dc770" />
                ) : (
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#949ba4' }} />
                )}
                Minimum 8 characters length
              </div>
            </div>

            {/* Terms of Service Checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
              <input
                type="checkbox"
                id="terms-check"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{
                  marginTop: 2,
                  accentColor: '#5865f2',
                  cursor: 'pointer',
                  width: 16,
                  height: 16,
                }}
              />
              <label
                htmlFor="terms-check"
                style={{
                  fontSize: 12,
                  color: '#b5bac1',
                  lineHeight: 1.4,
                  cursor: 'pointer',
                }}
              >
                I agree to Discordia&apos;s{' '}
                <span style={{ color: '#00a8fc' }}>Terms of Service</span> and acknowledge having read the{' '}
                <span style={{ color: '#00a8fc' }}>Privacy Policy</span>.
              </label>
            </div>

            {/* Create Account Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#5865f2',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#4752c4';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#5865f2';
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Link back to login */}
            <div style={{ fontSize: 13, color: '#949ba4', marginTop: 4 }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleNavigate('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00a8fc',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD SCREEN */}
        {screen === 'forgot' && (
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#b5bac1',
                  marginBottom: 6,
                  letterSpacing: '0.02em',
                }}
              >
                Registered Email Address <span style={{ color: '#da373c' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail
                  size={18}
                  style={{ position: 'absolute', left: 12, color: '#949ba4', pointerEvents: 'none' }}
                />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@domain.com"
                  style={{
                    width: '100%',
                    backgroundColor: '#1e1f22',
                    color: '#dbdee1',
                    border: '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: 6,
                    padding: '10px 12px 10px 38px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#5865f2',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#4752c4';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#5865f2';
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Sending link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#00a8fc',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </form>
        )}

        {/* 4. 2FA SCREEN */}
        {screen === '2fa' && (
          <form onSubmit={handle2FASubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: 'rgba(88, 101, 242, 0.1)',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid rgba(88, 101, 242, 0.2)',
              }}
            >
              <ShieldCheck size={20} color="#5865f2" />
              <span style={{ fontSize: 13, color: '#dbdee1' }}>
                {useBackupCode ? 'Backup Code Verification' : 'Authenticator Code'}
              </span>
            </div>

            {!useBackupCode ? (
              <div>
                <label
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#b5bac1',
                    marginBottom: 12,
                  }}
                >
                  Enter 6-Digit Code
                </label>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {twoFactorCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`2fa-digit-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      onPaste={index === 0 ? handleDigitPaste : undefined}
                      style={{
                        width: 44,
                        height: 52,
                        backgroundColor: '#1e1f22',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 8,
                        textAlign: 'center',
                        fontSize: 22,
                        fontWeight: 700,
                        color: '#f2f3f5',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#5865f2')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#b5bac1',
                    marginBottom: 6,
                  }}
                >
                  8-Character Backup Code
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <KeyRound
                    size={18}
                    style={{ position: 'absolute', left: 12, color: '#949ba4', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="ABCD-1234"
                    style={{
                      width: '100%',
                      backgroundColor: '#1e1f22',
                      color: '#dbdee1',
                      border: '1px solid rgba(0, 0, 0, 0.3)',
                      borderRadius: 6,
                      padding: '10px 12px 10px 38px',
                      fontSize: 15,
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '0.1em',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Toggle Backup Code vs 6 Digits */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setUseBackupCode(!useBackupCode);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00a8fc',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                {useBackupCode ? 'Use 6-digit Authenticator Code instead' : 'Lost your device? Use a backup code'}
              </button>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#5865f2',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#4752c4';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#5865f2';
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </button>

            {/* Cancel back to login */}
            <button
              type="button"
              onClick={() => handleNavigate('login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#949ba4',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dbdee1')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#949ba4')}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </form>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AuthView;
