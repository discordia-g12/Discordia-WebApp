import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Palette,
  Mic,
  MicOff,
  Bell,
  Lock,
  Check,
  Copy,
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  Circle,
} from 'lucide-react';
import { User, Status } from '../types';
import { Avatar } from '../components/Avatar';


export interface UserSettingsProps {
  currentUser?: User;
  onClose?: () => void;
  onUpdateUser?: (updatedUser: User) => void;
  onLogout?: () => void;
}

type SettingsTab =
  | 'profile'
  | 'security'
  | 'premium'
  | 'billing'
  | 'appearance'
  | 'voice'
  | 'notifications';

const STATUS_CONFIG: Record<
  'online' | 'idle' | 'dnd' | 'invisible',
  { label: string; color: string }
> = {
  online: { label: 'Online', color: '#23a55a' },
  idle: { label: 'Idle', color: '#f0b232' },
  dnd: { label: 'Do Not Disturb', color: '#f23f43' },
  invisible: { label: 'Invisible', color: '#80848e' },
};

const BACKUP_CODES = [
  'A8F4-B92C',
  '39DE-81FC',
  '7B12-9A4E',
  '55D2-CC41',
  '901A-EE88',
  '2F44-B109',
  '88AA-1122',
  '66FE-3310',
];

export const UserSettings: React.FC<UserSettingsProps> = ({
  currentUser: initialUser,
  onClose,
  onUpdateUser,
  onLogout,
}) => {
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
      setPasswordMsg({ type: 'error', text: 'Current password is required.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setPasswordMsg({ type: 'success', text: 'Password successfully updated!' });
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
    const confirmCancel = window.confirm('Are you sure you want to cancel your Discordia Premium subscription?');
    if (!confirmCancel) return;
    setIsPremium(false);
  };

  // Purchase points package
  const handleBuyPoints = (amount: number) => {
    setPurchasingPackage(amount);
    setTimeout(() => {
      setPoints((prev) => prev + amount);
      setPurchasingPackage(null);
      setBillingFeedback(`Successfully purchased ${amount.toLocaleString()} 💠 Points!`);
      setTimeout(() => setBillingFeedback(null), 3500);
    }, 1000);
  };

  const copyBackupCodesToClipboard = () => {
    navigator.clipboard.writeText(BACKUP_CODES.join('\n'));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundColor: '#313338',
        color: '#dbdee1',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sidebar */}
      <nav
        style={{
          width: sidebarCollapsed ? 64 : 240,
          backgroundColor: '#2b2d31',
          borderRight: '1px solid rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.2s ease',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Sidebar Top Toggle */}
        <div
          style={{
            padding: sidebarCollapsed ? '16px 8px' : '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
          }}
        >
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f2f3f5' }}>User Settings</div>
              <div style={{ fontSize: 11, color: '#949ba4', textTransform: 'uppercase' }}>Preferences</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'none',
              border: 'none',
              color: '#b5bac1',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Categories and Nav links */}
        <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {/* Group 1: User Settings */}
          {!sidebarCollapsed && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#949ba4', padding: '6px 12px' }}>
              User Settings
            </div>
          )}

          {[
            { id: 'profile', label: 'My Account & Profile', icon: UserIcon },
            { id: 'security', label: 'Security & 2FA', icon: ShieldCheck },
            { id: 'premium', label: 'Discordia Premium', icon: Sparkles },
            { id: 'billing', label: 'Billing & Points', icon: CreditCard },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as SettingsTab)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: sidebarCollapsed ? '10px 0' : '8px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#b5bac1',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '10px 6px' }} />

          {/* Group 2: App Settings */}
          {!sidebarCollapsed && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#949ba4', padding: '6px 12px' }}>
              App Settings
            </div>
          )}

          {[
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'voice', label: 'Voice & Audio', icon: Mic },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as SettingsTab)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: sidebarCollapsed ? '10px 0' : '8px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#b5bac1',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Logout Button */}
          <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '10px 6px' }} />
          <button
            type="button"
            onClick={() => {
              const confirmLogout = window.confirm('Are you sure you want to log out of Discordia?');
              if (confirmLogout) onLogout?.();
            }}
            title={sidebarCollapsed ? 'Log Out' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: sidebarCollapsed ? '10px 0' : '8px 12px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              backgroundColor: 'transparent',
              color: '#fa777c',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(218, 55, 60, 0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#313338',
        }}
      >
        {/* Top Header with ESC Button */}
        <div
          style={{
            height: 56,
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0, 0, 0, 0.25)',
            backgroundColor: '#2b2d31',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0, textTransform: 'capitalize' }}>
              {activeTab}
            </h2>
            {saveSuccess && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(35, 165, 90, 0.2)',
                  color: '#2dc770',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Check size={14} /> Changes Saved
              </span>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close settings (ESC)"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                color: '#b5bac1',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  border: '2px solid #b5bac1',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>ESC</span>
            </button>
          )}
        </div>

        {/* View Details */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
          <div style={{ maxWidth: 740 }}>
            {/* 1. PROFILE TAB */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {/* Account Card */}
                <div
                  style={{
                    backgroundColor: '#1e1f22',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div
                    style={{
                      height: 100,
                      backgroundColor: baseUser.bannerColor || '#5865f2',
                    }}
                  />
                  <div style={{ padding: '0 20px 20px 20px', marginTop: -36 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <img
                        src={baseUser.avatarUrl || baseUser.avatar || ''}
                        alt={displayName}
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          border: '5px solid #1e1f22',
                          objectFit: 'cover',
                        }}
                      />
                      <div style={{ fontSize: 13, color: '#949ba4' }}>
                        User ID: <code>{baseUser.id}</code>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#f2f3f5' }}>{displayName}</div>
                      <div style={{ fontSize: 13, color: '#949ba4' }}>@{baseUser.username}</div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Display Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      maxLength={32}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Username (Locked) */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1' }}>
                        Username
                      </label>
                      <Lock size={13} color="#949ba4" />
                      <span style={{ fontSize: 11, color: '#949ba4' }}>
                        (Usernames are immutable platform identifiers)
                      </span>
                    </div>
                    <input
                      type="text"
                      disabled
                      value={`@${baseUser.username}`}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#80848e',
                        border: '1px solid rgba(0, 0, 0, 0.2)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        fontSize: 14,
                        cursor: 'not-allowed',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1' }}>
                        About Me (Bio)
                      </label>
                      <span style={{ fontSize: 12, color: '#949ba4' }}>{bio.length}/190</span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={190}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'none',
                      }}
                    />
                  </div>

                  {/* Presence Status */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 8 }}>
                      Status
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {(['online', 'idle', 'dnd', 'invisible'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatus(st)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 12px',
                            backgroundColor: status === st ? 'rgba(255, 255, 255, 0.1)' : '#1e1f22',
                            border: status === st ? `2px solid ${STATUS_CONFIG[st].color}` : '1px solid rgba(0,0,0,0.3)',
                            borderRadius: 6,
                            color: '#dbdee1',
                            cursor: 'pointer',
                          }}
                        >
                          <Circle size={10} fill={STATUS_CONFIG[st].color} strokeWidth={0} />
                          <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{STATUS_CONFIG[st].label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Status */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                      Custom Status
                    </label>
                    <input
                      type="text"
                      maxLength={64}
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      placeholder="What are you up to?"
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Save Profile Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      style={{
                        backgroundColor: '#5865f2',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SECURITY TAB */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {/* 2FA Card */}
                <div
                  style={{
                    backgroundColor: '#2b2d31',
                    borderRadius: 8,
                    padding: 20,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 8,
                          backgroundColor: 'rgba(35, 165, 90, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2dc770',
                        }}
                      >
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5' }}>
                          Two-Factor Authentication (2FA)
                        </div>
                        <div style={{ fontSize: 13, color: '#2dc770', fontWeight: 600, marginTop: 2 }}>
                          Enabled & Protecting Account
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowBackupCodes(!showBackupCodes)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#dbdee1',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '8px 14px',
                        borderRadius: 4,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {showBackupCodes ? 'Hide Backup Codes' : 'View Backup Codes'}
                    </button>
                  </div>

                  {/* Backup Codes Accordion */}
                  {showBackupCodes && (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 16,
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <div style={{ fontSize: 13, color: '#b5bac1', marginBottom: 12 }}>
                        Keep these one-time backup codes in a safe place in case you lose access to your authenticator app.
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 8,
                          backgroundColor: '#1e1f22',
                          padding: 12,
                          borderRadius: 6,
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 13,
                          color: '#f2f3f5',
                          textAlign: 'center',
                        }}
                      >
                        {BACKUP_CODES.map((code, i) => (
                          <div key={i} style={{ padding: '4px 0' }}>
                            {code}
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={copyBackupCodesToClipboard}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: '#5865f2',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                          {copiedCode ? 'Copied!' : 'Copy All Codes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Change Password Form */}
                <form
                  onSubmit={handleUpdatePassword}
                  style={{
                    backgroundColor: '#2b2d31',
                    borderRadius: 8,
                    padding: 20,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                      Change Password
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#949ba4',
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showPasswords ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {passwordMsg && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: 4,
                        fontSize: 13,
                        backgroundColor: passwordMsg.type === 'success' ? 'rgba(35, 165, 90, 0.15)' : 'rgba(218, 55, 60, 0.15)',
                        color: passwordMsg.type === 'success' ? '#2dc770' : '#fa777c',
                        border: `1px solid ${passwordMsg.type === 'success' ? '#23a55a' : '#da373c'}`,
                      }}
                    >
                      {passwordMsg.text}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                      Current Password
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '8px 10px',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                      New Password (min 8 chars)
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '8px 10px',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                      Confirm New Password
                    </label>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '8px 10px',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#5865f2',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. PREMIUM TAB */}
            {activeTab === 'premium' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {/* Hero Card */}
                <div
                  style={{
                    padding: 28,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
                    boxShadow: '0 8px 32px rgba(88, 101, 242, 0.3)',
                    color: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Sparkles size={28} />
                    <h3 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Discordia Premium</h3>
                  </div>
                  <p style={{ fontSize: 15, margin: '0 0 16px 0', opacity: 0.9 }}>
                    Supercharge your Discordia experience with enhanced streaming, massive uploads, and free server boosts.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isPremium ? (
                      <span
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#2e3338',
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Check size={16} color="#23a55a" /> Active Subscriber
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Free Plan
                      </span>
                    )}
                  </div>
                </div>

                {/* Billing Cycle Selector */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      backgroundColor: '#2b2d31',
                      borderRadius: 8,
                      padding: 4,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      style={{
                        padding: '8px 18px',
                        backgroundColor: billingCycle === 'monthly' ? '#5865f2' : 'transparent',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Monthly ($9.99/mo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      style={{
                        padding: '8px 18px',
                        backgroundColor: billingCycle === 'yearly' ? '#5865f2' : 'transparent',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Yearly ($99.99/yr - Save 16%)
                    </button>
                  </div>
                </div>

                {/* Feature Comparison List */}
                <div
                  style={{
                    backgroundColor: '#2b2d31',
                    borderRadius: 8,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5' }}>Included Benefits</div>
                  {[
                    'HD 1080p 60FPS Video Streaming & Screen Sharing',
                    '50MB file attachment uploads (vs 10MB default)',
                    '2 Server Boosts included every month ($10.00 value)',
                    'Custom emojis usable across any server or private DM',
                    'Special Discordia Nitro profile badge and animated avatars',
                    'Double character limit: up to 4,000 characters per message',
                  ].map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Check size={18} color="#2dc770" />
                      <span style={{ fontSize: 14, color: '#dbdee1' }}>{feat}</span>
                    </div>
                  ))}

                  {/* Payment CTA */}
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {!isPremium ? (
                      <button
                        type="button"
                        onClick={handleSubscribePremium}
                        disabled={paymentStatus === 'paying'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: 6,
                          fontSize: 15,
                          fontWeight: 700,
                          cursor: paymentStatus === 'paying' ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {paymentStatus === 'paying' ? (
                          <>
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            Processing Payment...
                          </>
                        ) : paymentStatus === 'success' ? (
                          <>
                            <Check size={18} />
                            Subscribed!
                          </>
                        ) : (
                          `Subscribe Now (${billingCycle === 'monthly' ? '$9.99/mo' : '$99.99/yr'})`
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCancelPremium}
                        style={{
                          backgroundColor: 'transparent',
                          color: '#fa777c',
                          border: '1px solid rgba(218, 55, 60, 0.4)',
                          padding: '10px 18px',
                          borderRadius: 6,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel Premium Subscription
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. BILLING TAB */}
            {activeTab === 'billing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {/* Points Balance Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 24,
                    backgroundColor: '#2b2d31',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#949ba4' }}>
                      Current Wallet Balance
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#f2f3f5', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span>💠</span>
                      <span>{points.toLocaleString()} Points</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: '#949ba4', textAlign: 'right' }}>
                    Used for Server Boosts (500 💠)<br />and custom emojis.
                  </div>
                </div>

                {billingFeedback && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: 'rgba(35, 165, 90, 0.15)',
                      border: '1px solid #23a55a',
                      borderRadius: 6,
                      padding: '10px 14px',
                      color: '#2dc770',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Check size={16} />
                    {billingFeedback}
                  </div>
                )}

                {/* Points Store Grid */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', marginBottom: 16 }}>
                    Purchase Points Packs
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                    {[
                      { points: 500, price: '$4.99', badge: null },
                      { points: 1000, price: '$9.49', badge: '5% OFF' },
                      { points: 2500, price: '$21.99', badge: '12% OFF' },
                      { points: 5000, price: '$39.99', badge: 'BEST VALUE' },
                    ].map((pack) => (
                      <div
                        key={pack.points}
                        style={{
                          backgroundColor: '#2b2d31',
                          borderRadius: 8,
                          padding: 20,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          position: 'relative',
                          border: pack.badge === 'BEST VALUE' ? '2px solid #5865f2' : '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {pack.badge && (
                          <span
                            style={{
                              position: 'absolute',
                              top: -10,
                              backgroundColor: '#5865f2',
                              color: '#ffffff',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 10,
                            }}
                          >
                            {pack.badge}
                          </span>
                        )}

                        <div style={{ fontSize: 28, marginBottom: 8 }}>💠</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#f2f3f5' }}>
                          {pack.points.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 13, color: '#949ba4', marginBottom: 16 }}>Points</div>

                        <button
                          type="button"
                          onClick={() => handleBuyPoints(pack.points)}
                          disabled={purchasingPackage === pack.points}
                          style={{
                            width: '100%',
                            padding: '8px 0',
                            backgroundColor: '#5865f2',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: purchasingPackage === pack.points ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          {purchasingPackage === pack.points ? (
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            pack.price
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {/* Theme Selector */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', marginBottom: 12 }}>Theme</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {(['dark', 'light', 'auto'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTheme(t)}
                        style={{
                          padding: 16,
                          backgroundColor: '#2b2d31',
                          borderRadius: 8,
                          border: theme === t ? '2px solid #5865f2' : '1px solid rgba(255, 255, 255, 0.06)',
                          color: '#dbdee1',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: t === 'dark' ? '#1e1f22' : t === 'light' ? '#f2f3f5' : '#5865f2',
                            border: '1px solid rgba(0,0,0,0.3)',
                          }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Display Mode */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', marginBottom: 12 }}>
                    Message Display Mode
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <button
                      type="button"
                      onClick={() => setDisplayMode('cozy')}
                      style={{
                        padding: 16,
                        backgroundColor: '#2b2d31',
                        borderRadius: 8,
                        border: displayMode === 'cozy' ? '2px solid #5865f2' : '1px solid rgba(255, 255, 255, 0.06)',
                        color: '#dbdee1',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f2f3f5' }}>Cozy</div>
                      <div style={{ fontSize: 12, color: '#949ba4', marginTop: 4 }}>
                        Modern, spacious, with full-size user avatars.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDisplayMode('compact')}
                      style={{
                        padding: 16,
                        backgroundColor: '#2b2d31',
                        borderRadius: 8,
                        border: displayMode === 'compact' ? '2px solid #5865f2' : '1px solid rgba(255, 255, 255, 0.06)',
                        color: '#dbdee1',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f2f3f5' }}>Compact</div>
                      <div style={{ fontSize: 12, color: '#949ba4', marginTop: 4 }}>
                        Dense layout for power users with inline timestamps.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#949ba4', marginBottom: 8 }}>
                    Chat Display Preview
                  </h4>
                  <div
                    style={{
                      backgroundColor: '#1e1f22',
                      borderRadius: 8,
                      padding: 16,
                      fontSize: fontSize,
                    }}
                  >
                    {displayMode === 'cozy' ? (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <Avatar user={{ ...baseUser, avatar: baseUser.avatarUrl || baseUser.avatar || "" } as any} size={40} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: '#f2f3f5' }}>{displayName}</span>
                            <span style={{ fontSize: 11, color: '#949ba4' }}>Today at 12:45 PM</span>
                          </div>
                          <div style={{ color: '#dbdee1', marginTop: 4 }}>
                            Welcome to Discordia! The user interface adapts in real-time to your preferences.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#949ba4' }}>[12:45 PM]</span>
                        <span style={{ fontWeight: 600, color: '#f2f3f5' }}>{displayName}:</span>
                        <span style={{ color: '#dbdee1' }}>
                          Compact mode gives you maximum line density and screen space.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Font Scaling Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1' }}>
                      Chat Font Size
                    </label>
                    <span style={{ fontSize: 12, color: '#949ba4' }}>{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={18}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#5865f2', cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            {/* 6. VOICE TAB */}
            {activeTab === 'voice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {/* Audio Devices */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Input Device */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                      Input Device (Microphone)
                    </label>
                    <select
                      value={inputDevice}
                      onChange={(e) => setInputDevice(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    >
                      <option value="Default - Microphone (Built-in)">Default - Microphone (Built-in)</option>
                      <option value="External USB Microphone">External USB Microphone</option>
                      <option value="Headset Microphone (Bluetooth)">Headset Microphone (Bluetooth)</option>
                    </select>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b5bac1', marginBottom: 4 }}>
                        <span>Input Volume</span>
                        <span>{inputVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={inputVolume}
                        onChange={(e) => setInputVolume(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#5865f2' }}
                      />
                    </div>
                  </div>

                  {/* Output Device */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                      Output Device (Speakers)
                    </label>
                    <select
                      value={outputDevice}
                      onChange={(e) => setOutputDevice(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    >
                      <option value="Default - Speakers (Built-in)">Default - Speakers (Built-in)</option>
                      <option value="Headphones (AirPods)">Headphones (AirPods)</option>
                      <option value="External Studio Monitors">External Studio Monitors</option>
                    </select>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b5bac1', marginBottom: 4 }}>
                        <span>Output Volume</span>
                        <span>{outputVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={outputVolume}
                        onChange={(e) => setOutputVolume(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#5865f2' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Microphone Test Section */}
                <div
                  style={{
                    backgroundColor: '#2b2d31',
                    borderRadius: 8,
                    padding: 20,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f2f3f5' }}>Mic Test</div>
                      <div style={{ fontSize: 13, color: '#949ba4' }}>
                        Having mic issues? Click &ldquo;Let&apos;s Check&rdquo; to test your audio output level.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTestingMic(!isTestingMic)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: isTestingMic ? '#da373c' : '#5865f2',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 4,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isTestingMic ? <MicOff size={16} /> : <Mic size={16} />}
                      {isTestingMic ? 'Stop Testing' : "Let's Check"}
                    </button>
                  </div>

                  {/* Level Indicator Bar */}
                  <div
                    style={{
                      height: 16,
                      backgroundColor: '#1e1f22',
                      borderRadius: 8,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${micLevel}%`,
                        background: 'linear-gradient(90deg, #23a55a 60%, #f0b232 85%, #f23f43 100%)',
                        borderRadius: 8,
                        transition: 'width 0.1s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                  App Notification Preferences
                </h3>

                {[
                  {
                    title: 'Enable Desktop Notifications',
                    desc: 'Show system banners on message or mention events.',
                    checked: enableDesktop,
                    setter: setEnableDesktop,
                  },
                  {
                    title: 'Unread Message Badge',
                    desc: 'Display red unread notification count on app badge and icon.',
                    checked: enableBadge,
                    setter: setEnableBadge,
                  },
                  {
                    title: 'Enable Notification Sounds',
                    desc: 'Play sound alerts for incoming DMs, mentions, and server pings.',
                    checked: enableSounds,
                    setter: setEnableSounds,
                  },
                  {
                    title: 'Message Preview in Notifications',
                    desc: 'Include sender name and message snippet in popups.',
                    checked: previewContent,
                    setter: setPreviewContent,
                  },
                ].map((toggle, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: '#2b2d31',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>{toggle.title}</div>
                      <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>{toggle.desc}</div>
                    </div>
                    <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={toggle.checked}
                        onChange={(e) => toggle.setter(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        className="slider"
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: toggle.checked ? '#23a55a' : '#80848e',
                          borderRadius: 24,
                          transition: '0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            height: 18,
                            width: 18,
                            left: toggle.checked ? 19 : 3,
                            bottom: 3,
                            backgroundColor: '#ffffff',
                            borderRadius: '50%',
                            transition: '0.2s',
                          }}
                        />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UserSettings;
