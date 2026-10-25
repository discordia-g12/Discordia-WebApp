import React, { useState, useEffect } from 'react';
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
  const baseUser = initialUser || ({ id: '' } as any);

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Profile Tab State
  const [displayName, setDisplayName] = useState(baseUser.displayName || '');
  const [bio, setBio] = useState(baseUser.bio || '');
  const [status, setStatus] = useState<Status>(baseUser.status || 'online');
  const [customStatus, setCustomStatus] = useState(baseUser.customStatus || '');

  // Security Tab State
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
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
    navigator.clipboard.writeText(BACKUP_CODES.join('\n'));
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
