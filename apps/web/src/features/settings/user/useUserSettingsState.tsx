import React, { useState, useEffect } from 'react';
import {
  activateTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateRecoveryCodes,
  setupTwoFactor,
  useSession,
} from '@discordia/core';
import { User, Status } from '../../../types';
import { SettingsTab, BACKUP_CODES } from './shared';

/** Lo que recibe la pantalla de ajustes de usuario. */
export interface UserSettingsProps {
  currentUser?: User;
  onClose?: () => void;
  onUpdateUser?: (updatedUser: User) => void;
  onLogout?: () => void;
}


/** Estado y handlers de UserSettings: viven en el componente y lo comparten todas sus pestañas. */
export function useUserSettingsState(props: UserSettingsProps) {
  const {
    currentUser: initialUser,
    onClose,
    onUpdateUser,
    onLogout,
  } = props;
  const baseUser = initialUser || ({ id: '' } as User);
  const sessionProfile = useSession((s) => s.profile);
  const effectiveUserId =
    (initialUser?.id && initialUser.id !== 'temp_id' ? initialUser.id : '') ||
    sessionProfile?.id ||
    sessionProfile?.user_id ||
    (sessionProfile as unknown as { sub?: string })?.sub ||
    '';
  const isGoogleUser = Boolean(
    effectiveUserId.startsWith('google-oauth2|') ||
    (sessionProfile as unknown as { sub?: string })?.sub?.startsWith('google-oauth2|')
  );

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Profile Tab State
  const [displayName, setDisplayName] = useState(baseUser.displayName || '');
  const [bio, setBio] = useState(baseUser.bio || '');
  const [status, setStatus] = useState<Status>(baseUser.status || 'online');
  const [customStatus, setCustomStatus] = useState(baseUser.customStatus || '');

  // Security Tab State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Setup state (CA 1)
  const [isSettingUpTwoFactor, setIsSettingUpTwoFactor] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<{
    secret: string;
    qrCode: string;
    otpauthUrl: string;
  } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Disable state (CA 5)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Premium Tab State
  const [isPremium, setIsPremium] = useState<boolean>(baseUser.isPremium ?? true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'paying' | 'success' | 'rejected'>('idle');

  // Billing Tab State
  const [points, setPoints] = useState<number>(baseUser.points ?? 840);
  const [purchasingPackage, setPurchasingPackage] = useState<number | null>(null);
  const [billingFeedback, setBillingFeedback] = useState<string | null>(null);

  // Appearance Tab State
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('dark');
  const [displayMode, setDisplayMode] = useState<'cozy' | 'compact'>('cozy');
  const [fontSize, setFontSize] = useState<number>(14);

  // Voice Tab State
  const [inputDevice, setInputDevice] = useState('Default - Microphone (Built-in)');
  const [outputDevice, setOutputDevice] = useState('Default - Speakers (Built-in)');
  const [inputVolume, setInputVolume] = useState<number>(85);
  const [outputVolume, setOutputVolume] = useState<number>(100);
  const [isTestingMic, setIsTestingMic] = useState<boolean>(false);
  const [micLevel, setMicLevel] = useState<number>(0);

  // Notifications Tab State
  const [enableDesktop, setEnableDesktop] = useState(true);
  const [enableBadge, setEnableBadge] = useState(true);
  const [enableSounds, setEnableSounds] = useState(true);
  const [previewContent, setPreviewContent] = useState(true);

  // Cargar estado inicial de 2FA
  useEffect(() => {
    let mounted = true;
    getTwoFactorStatus()
      .then((res) => {
        if (mounted) {
          setTwoFactorEnabled(res.enabled);
          setTwoFactorLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setTwoFactorLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleStartSetup = async () => {
    setSetupError(null);
    setSetupCode('');
    setIsSettingUpTwoFactor(true);
    try {
      const res = await setupTwoFactor();
      setTwoFactorSetupData({
        secret: res.secret,
        qrCode: res.qr_code,
        otpauthUrl: res.otpauth_url,
      });
    } catch {
      setSetupError('No se pudo generar el código de configuración.');
    }
  };

  const handleCancelSetup = () => {
    setIsSettingUpTwoFactor(false);
    setTwoFactorSetupData(null);
    setSetupCode('');
    setSetupError(null);
  };

  const handleConfirmSetup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSetupError(null);
    if (!setupCode.trim()) {
      setSetupError('Ingresá el código de 6 dígitos.');
      return;
    }
    setIsActivating(true);
    try {
      const res = await activateTwoFactor(setupCode.trim());
      setTwoFactorEnabled(true);
      setBackupCodes(res.recovery_codes);
      setShowBackupCodes(true);
      setIsSettingUpTwoFactor(false);
      setTwoFactorSetupData(null);
      setSetupCode('');
    } catch (err: unknown) {
      const eObj = err as { detail?: string; message?: string };
      setSetupError(eObj?.detail || eObj?.message || 'Código de verificación incorrecto o expirado.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleStartDisable = () => {
    setShowDisableConfirm(true);
    setDisablePassword('');
    setDisableError(null);
  };

  const handleCancelDisable = () => {
    setShowDisableConfirm(false);
    setDisablePassword('');
    setDisableError(null);
  };

  const handleConfirmDisable = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setDisableError(null);
    if (!disablePassword.trim()) {
      setDisableError(
        isGoogleUser
          ? 'Ingresá el código de verificación o de recuperación.'
          : 'Ingresá tu contraseña actual.'
      );
      return;
    }
    setIsDisabling(true);
    try {
      await disableTwoFactor(disablePassword.trim());
      setTwoFactorEnabled(false);
      setShowDisableConfirm(false);
      setBackupCodes([]);
      setShowBackupCodes(false);
      setDisablePassword('');
    } catch (err: unknown) {
      const eObj = err as { detail?: string; message?: string };
      setDisableError(
        eObj?.detail ||
        eObj?.message ||
        (isGoogleUser
          ? 'Código de verificación o de recuperación incorrecto.'
          : 'La contraseña ingresada es incorrecta.')
      );
    } finally {
      setIsDisabling(false);
    }
  };

  const handleRegenerateCodes = async () => {
    try {
      const res = await regenerateRecoveryCodes();
      setBackupCodes(res.recovery_codes);
      setShowBackupCodes(true);
    } catch {
      // Ignorar fallo de regeneración
    }
  };

  // Simulated Mic Testing Level Animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTestingMic) {
      interval = setInterval(() => {
        // Random volume fluctuations between 20% and 90%
        setMicLevel(Math.floor(20 + Math.random() * 70));
      }, 120);
    } else {
      setMicLevel(0);
    }
    return () => clearInterval(interval);
  }, [isTestingMic]);

  // Save profile changes
  const handleSaveProfile = () => {
    const updated: User = {
      ...baseUser,
      displayName: displayName.trim(),
      bio: bio.trim(),
      status,
      customStatus: customStatus.trim(),
    };
    onUpdateUser?.(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Password update handler
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Ingresá tu contraseña actual.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'La contraseña nueva debe tener al menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setPasswordMsg({ type: 'success', text: 'Contraseña actualizada.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordMsg(null), 3500);
  };

  // Premium checkout simulation
  const handleSubscribePremium = () => {
    setPaymentStatus('paying');
    setTimeout(() => {
      setPaymentStatus('success');
      setIsPremium(true);
      setTimeout(() => setPaymentStatus('idle'), 3000);
    }, 1200);
  };

  const handleCancelPremium = () => {
    const confirmCancel = window.confirm('¿Cancelar tu suscripción a Discordia Premium?');
    if (!confirmCancel) return;
    setIsPremium(false);
  };

  // Purchase points package
  const handleBuyPoints = (amount: number) => {
    setPurchasingPackage(amount);
    setTimeout(() => {
      setPoints((prev) => prev + amount);
      setPurchasingPackage(null);
      setBillingFeedback(`Compraste ${amount.toLocaleString('es-AR')} puntos.`);
      setTimeout(() => setBillingFeedback(null), 3500);
    }, 1000);
  };

  const copyBackupCodesToClipboard = () => {
    const codesToCopy = backupCodes.length > 0 ? backupCodes : BACKUP_CODES;
    navigator.clipboard.writeText(codesToCopy.join('\n'));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return {

    initialUser,
    onClose,
    onUpdateUser,
    onLogout,
    baseUser,
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    saveSuccess,
    setSaveSuccess,
    displayName,
    setDisplayName,
    bio,
    setBio,
    status,
    setStatus,
    customStatus,
    setCustomStatus,
    showBackupCodes,
    setShowBackupCodes,
    copiedCode,
    twoFactorEnabled,
    twoFactorLoading,
    backupCodes: backupCodes.length > 0 ? backupCodes : BACKUP_CODES,
    isSettingUpTwoFactor,
    twoFactorSetupData,
    setupCode,
    setSetupCode,
    setupError,
    isActivating,
    showDisableConfirm,
    isGoogleUser,
    disablePassword,
    setDisablePassword,
    disableError,
    isDisabling,
    handleStartSetup,
    handleCancelSetup,
    handleConfirmSetup,
    handleStartDisable,
    handleCancelDisable,
    handleConfirmDisable,
    handleRegenerateCodes,
    setCopiedCode,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showPasswords,
    setShowPasswords,
    passwordMsg,
    setPasswordMsg,
    isPremium,
    setIsPremium,
    billingCycle,
    setBillingCycle,
    paymentStatus,
    setPaymentStatus,
    points,
    setPoints,
    purchasingPackage,
    setPurchasingPackage,
    billingFeedback,
    setBillingFeedback,
    theme,
    setTheme,
    displayMode,
    setDisplayMode,
    fontSize,
    setFontSize,
    inputDevice,
    setInputDevice,
    outputDevice,
    setOutputDevice,
    inputVolume,
    setInputVolume,
    outputVolume,
    setOutputVolume,
    isTestingMic,
    setIsTestingMic,
    micLevel,
    setMicLevel,
    enableDesktop,
    setEnableDesktop,
    enableBadge,
    setEnableBadge,
    enableSounds,
    setEnableSounds,
    previewContent,
    setPreviewContent,
    handleSaveProfile,
    handleUpdatePassword,
    handleSubscribePremium,
    handleCancelPremium,
    handleBuyPoints,
    copyBackupCodesToClipboard,
  };
}

export type UserSettingsState = ReturnType<typeof useUserSettingsState>;
