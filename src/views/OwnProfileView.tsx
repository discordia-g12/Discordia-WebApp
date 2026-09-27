import React, { useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Trash2,
  Check,
  Loader2,
  Calendar,
  Edit3,
  X,
  Circle,
} from 'lucide-react';
import { User, Status } from '../types';
import { Role } from '../types';

import { Avatar } from '../components/Avatar';
export type ProfileMode = 'view' | 'edit' | 'saving';

export interface OwnProfileViewProps {
  currentUser?: User;
  onBack?: () => void;
  onSave?: (updatedUser: User) => void;
}

const PRESET_BANNER_COLORS = [
  '#5865f2', // Blurple
  '#3ba55d', // Green
  '#faa81a', // Amber / Orange
  '#eb459e', // Pink
  '#ed4245', // Red
  '#593695', // Purple
  '#23272a', // Dark
  '#00a8fc', // Cyan / Light Blue
];

const STATUS_CONFIG: Record<
  'online' | 'idle' | 'dnd' | 'invisible',
  { label: string; color: string; desc: string }
> = {
  online: { label: 'Online', color: '#23a55a', desc: 'Available for chats and calls' },
  idle: { label: 'Idle', color: '#f0b232', desc: 'Away from keyboard' },
  dnd: { label: 'Do Not Disturb', color: '#f23f43', desc: 'Mute desktop notifications' },
  invisible: { label: 'Invisible', color: '#80848e', desc: 'Appear offline to friends' },
};

export const OwnProfileView: React.FC<OwnProfileViewProps> = ({
  currentUser: initialUserProp,
  onBack,
  onSave,
}) => {
  const baseUser: User = initialUserProp || ({ id: '' } as any);

  const [mode, setMode] = useState<ProfileMode>('view');
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Editable Form State
  const [displayName, setDisplayName] = useState(baseUser.displayName || '');
  const [bio, setBio] = useState(baseUser.bio || '');
  const [status, setStatus] = useState<Status>(baseUser.status || 'online');
  const [customStatus, setCustomStatus] = useState(baseUser.customStatus || '');
  const [bannerColor, setBannerColor] = useState(baseUser.bannerColor || '#5865f2');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    baseUser.avatarUrl || baseUser.avatar || ''
  );
  const [defaultAvatar] = useState<string>(
    baseUser.avatarUrl || baseUser.avatar || ''
  );

  // Validation
  const isDisplayNameValid = displayName.trim().length >= 2 && displayName.trim().length <= 32;

  // Avatar file upload handler
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Avatar image size cannot exceed 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetAvatar = () => {
    setAvatarUrl(defaultAvatar);
  };

  // Discard changes
  const handleDiscard = () => {
    setDisplayName(baseUser.displayName || '');
    setBio(baseUser.bio || '');
    setStatus(baseUser.status || 'online');
    setCustomStatus(baseUser.customStatus || '');
    setBannerColor(baseUser.bannerColor || '#5865f2');
    setAvatarUrl(baseUser.avatarUrl || baseUser.avatar || defaultAvatar);
    setMode('view');
  };

  // Save changes
  const handleSave = () => {
    if (!isDisplayNameValid) return;

    setMode('saving');
    setTimeout(() => {
      const updated: User = {
        ...baseUser,
        displayName: displayName.trim(),
        bio: bio.trim(),
        status,
        customStatus: customStatus.trim(),
        bannerColor,
        avatar: avatarUrl,
        avatarUrl,
      };

      setMode('view');
      setSavedIndicator(true);
      onSave?.(updated);

      setTimeout(() => {
        setSavedIndicator(false);
      }, 2500);
    }, 750);
  };

  // Resolve user roles from []
  const userRoles = (baseUser.roleIds || ['r-admin', 'r-core'])
    .map((rid) => ([] as Role[]).find((r) => r.id === rid))
    .filter((r): r is Role => Boolean(r));

  const currentStatusColor =
    status === 'online'
      ? '#23a55a'
      : status === 'idle'
      ? '#f0b232'
      : status === 'dnd'
      ? '#f23f43'
      : '#80848e';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#1e1f22',
        color: '#dbdee1',
        overflow: 'hidden',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          padding: '0 24px',
          backgroundColor: '#2b2d31',
          borderBottom: '1px solid rgba(0, 0, 0, 0.25)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#b5bac1',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                padding: '6px 10px',
                borderRadius: 4,
                transition: 'background-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#b5bac1';
              }}
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
              User Profile
            </h1>
            {savedIndicator && (
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
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <Check size={14} /> Saved
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {mode === 'view' ? (
            <button
              onClick={() => setMode('edit')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#5865f2',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4752c4')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5865f2')}
            >
              <Edit3 size={16} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={mode === 'saving'}
                style={{
                  backgroundColor: 'transparent',
                  color: '#dbdee1',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '7px 14px',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: mode === 'saving' ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (mode !== 'saving') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  if (mode !== 'saving') e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={mode === 'saving' || !isDisplayNameValid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: isDisplayNameValid ? '#23a55a' : '#4e5058',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: mode === 'saving' || !isDisplayNameValid ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (mode !== 'saving' && isDisplayNameValid) {
                    e.currentTarget.style.backgroundColor = '#1a7e44';
                  }
                }}
                onMouseLeave={(e) => {
                  if (mode !== 'saving' && isDisplayNameValid) {
                    e.currentTarget.style.backgroundColor = '#23a55a';
                  }
                }}
              >
                {mode === 'saving' ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Left Column: Live Profile Card Preview */}
        <section
          style={{
            flex: '0 0 360px',
            backgroundColor: '#2b2d31',
            borderRight: '1px solid rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 24px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 320,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#949ba4',
              letterSpacing: '0.04em',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Live Preview</span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'rgba(88, 101, 242, 0.2)',
                color: '#5865f2',
              }}
            >
              Card Preview
            </span>
          </div>

          {/* Profile Card Container */}
          <div
            style={{
              width: '100%',
              maxWidth: 320,
              backgroundColor: '#111214',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
              position: 'relative',
            }}
          >
            {/* Banner */}
            <div
              style={{
                height: 105,
                backgroundColor: bannerColor,
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)`,
                position: 'relative',
                transition: 'background-color 0.2s',
              }}
            />

            {/* Avatar & Presence Ring */}
            <div
              style={{
                padding: '0 16px',
                marginTop: -44,
                position: 'relative',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                }}
              >
                <Avatar user={{ ...baseUser, avatar: avatarUrl } as any} size={80} />
                {/* Status Indicator Dot */}
                <span
                  title={status}
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: currentStatusColor,
                    border: '3px solid #111214',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Points Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#5865f2',
                  marginBottom: 8,
                }}
                title="Discordia Points"
              >
                <span>💠</span>
                <span>{baseUser.points ?? 0}</span>
              </div>
            </div>

            {/* Profile Info Body */}
            <div
              style={{
                padding: '12px 16px 20px 16px',
                backgroundColor: '#111214',
              }}
            >
              <div
                style={{
                  backgroundColor: '#232428',
                  borderRadius: 8,
                  padding: '12px',
                }}
              >
                {/* Display Name & Tag */}
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#f2f3f5',
                    margin: '0 0 2px 0',
                    lineHeight: 1.2,
                  }}
                >
                  {displayName || 'Anonymous User'}
                </h2>
                <div style={{ fontSize: 13, color: '#949ba4', marginBottom: 10 }}>
                  @{baseUser.username}
                  {baseUser.discriminator ? `#${baseUser.discriminator}` : ''}
                </div>

                {/* Custom Status */}
                {customStatus && (
                  <div
                    style={{
                      fontSize: 13,
                      fontStyle: 'italic',
                      color: '#dbdee1',
                      padding: '6px 10px',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 6,
                      marginBottom: 12,
                      borderLeft: '3px solid #5865f2',
                    }}
                  >
                    &ldquo;{customStatus}&rdquo;
                  </div>
                )}

                <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '12px 0' }} />

                {/* About Me (Bio) */}
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#b5bac1',
                      letterSpacing: '0.04em',
                      marginBottom: 4,
                    }}
                  >
                    About Me
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: '#dbdee1',
                      lineHeight: 1.45,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {bio || 'This user has not written a bio yet.'}
                  </p>
                </div>

                {/* Member Since / Created Date */}
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#b5bac1',
                      letterSpacing: '0.04em',
                      marginBottom: 4,
                    }}
                  >
                    Discordia Member Since
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#949ba4' }}>
                    <Calendar size={14} />
                    <span>
                      {baseUser.joinedAt
                        ? new Date(baseUser.joinedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Jan 10, 2022'}
                    </span>
                  </div>
                </div>

                {/* Roles */}
                {userRoles.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#b5bac1',
                        letterSpacing: '0.04em',
                        marginBottom: 6,
                      }}
                    >
                      Roles
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {userRoles.map((role) => (
                        <span
                          key={role?.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#dbdee1',
                            border: `1px solid ${role?.color || '#5865f2'}`,
                          }}
                        >
                          <Circle size={8} fill={role?.color || '#5865f2'} strokeWidth={0} />
                          {role?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Edit / View Form Details */}
        <main
          style={{
            flex: 1,
            padding: '36px 48px',
            overflowY: 'auto',
            backgroundColor: '#313338',
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f2f3f5', marginBottom: 8 }}>
              {mode === 'view' ? 'Profile Overview' : 'Edit Profile Information'}
            </h2>
            <p style={{ fontSize: 14, color: '#949ba4', marginBottom: 28 }}>
              Customize your public persona on Discordia. Changes will be reflected across your servers and direct messages.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* SECTION 1: AVATAR */}
              <div style={{ paddingBottom: 24, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#b5bac1',
                    marginBottom: 10,
                  }}
                >
                  Avatar
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <Avatar user={{ ...baseUser, avatar: avatarUrl } as any} size={72} />
                  {mode !== 'view' ? (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: '#5865f2',
                          color: '#ffffff',
                          padding: '8px 14px',
                          borderRadius: 4,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <Camera size={16} />
                        Change Avatar
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleAvatarFileChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleResetAvatar}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: 'rgba(218, 55, 60, 0.15)',
                          color: '#fa777c',
                          border: '1px solid rgba(218, 55, 60, 0.3)',
                          padding: '8px 14px',
                          borderRadius: 4,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} />
                        Remove Custom
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: '#949ba4' }}>
                      Click &ldquo;Edit Profile&rdquo; to upload a new avatar or restore default.
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 2: BANNER COLOR */}
              <div style={{ paddingBottom: 24, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#b5bac1',
                    marginBottom: 10,
                  }}
                >
                  Banner Color
                </label>
                {mode !== 'view' ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                      {PRESET_BANNER_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setBannerColor(col)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: col,
                            border: bannerColor.toLowerCase() === col.toLowerCase() ? '3px solid #ffffff' : '2px solid rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.1s',
                          }}
                        >
                          {bannerColor.toLowerCase() === col.toLowerCase() && <Check size={16} color="#ffffff" />}
                        </button>
                      ))}

                      {/* Native Color Picker input */}
                      <label
                        title="Custom Color Picker"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          backgroundColor: '#1e1f22',
                          borderRadius: 6,
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: '#dbdee1',
                        }}
                      >
                        <input
                          type="color"
                          value={bannerColor}
                          onChange={(e) => setBannerColor(e.target.value)}
                          style={{
                            width: 24,
                            height: 24,
                            border: 'none',
                            padding: 0,
                            borderRadius: 4,
                            cursor: 'pointer',
                            backgroundColor: 'transparent',
                          }}
                        />
                        <span>Custom ({bannerColor.toUpperCase()})</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: bannerColor,
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                      }}
                    />
                    <span style={{ fontSize: 13, color: '#dbdee1' }}>{bannerColor.toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* SECTION 3: DISPLAY NAME */}
              <div style={{ paddingBottom: 24, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#b5bac1',
                    }}
                  >
                    Display Name
                  </label>
                  <span style={{ fontSize: 12, color: displayName.length > 32 ? '#fa777c' : '#949ba4' }}>
                    {displayName.length}/32
                  </span>
                </div>

                {mode !== 'view' ? (
                  <div>
                    <input
                      type="text"
                      value={displayName}
                      maxLength={32}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter a display name"
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: isDisplayNameValid ? '1px solid rgba(0, 0, 0, 0.3)' : '1px solid #da373c',
                        borderRadius: 4,
                        padding: '10px 12px',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {!isDisplayNameValid && (
                      <span style={{ fontSize: 12, color: '#fa777c', marginTop: 4, display: 'block' }}>
                        Display name must be between 2 and 32 characters.
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f2f3f5' }}>{displayName}</div>
                )}
              </div>

              {/* SECTION 4: ABOUT ME (BIO) */}
              <div style={{ paddingBottom: 24, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#b5bac1',
                    }}
                  >
                    About Me (Bio)
                  </label>
                  <span style={{ fontSize: 12, color: bio.length > 190 ? '#fa777c' : '#949ba4' }}>
                    {bio.length}/190
                  </span>
                </div>

                {mode !== 'view' ? (
                  <textarea
                    rows={4}
                    maxLength={190}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell everyone a little bit about yourself..."
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
                      lineHeight: 1.4,
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 14, color: '#dbdee1', lineHeight: 1.4 }}>{bio || 'No bio provided.'}</div>
                )}
              </div>

              {/* SECTION 5: ONLINE STATUS */}
              <div style={{ paddingBottom: 24, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#b5bac1',
                    marginBottom: 10,
                  }}
                >
                  Presence Status
                </label>

                {mode !== 'view' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                    {(['online', 'idle', 'dnd', 'invisible'] as const).map((st) => {
                      const cfg = STATUS_CONFIG[st];
                      const isSelected = status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatus(st)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 12px',
                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : '#1e1f22',
                            border: isSelected ? `2px solid ${cfg.color}` : '1px solid rgba(0,0,0,0.3)',
                            borderRadius: 6,
                            color: isSelected ? '#ffffff' : '#b5bac1',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                        >
                          <Circle size={10} fill={cfg.color} strokeWidth={0} />
                          <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Circle
                      size={12}
                      fill={STATUS_CONFIG[status as 'online' | 'idle' | 'dnd' | 'invisible']?.color || '#80848e'}
                      strokeWidth={0}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#f2f3f5' }}>
                      {STATUS_CONFIG[status as 'online' | 'idle' | 'dnd' | 'invisible']?.label || 'Offline'}
                    </span>
                  </div>
                )}
              </div>

              {/* SECTION 6: CUSTOM STATUS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#b5bac1',
                    }}
                  >
                    Custom Status
                  </label>
                  <span style={{ fontSize: 12, color: customStatus.length > 64 ? '#fa777c' : '#949ba4' }}>
                    {customStatus.length}/64
                  </span>
                </div>

                {mode !== 'view' ? (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      maxLength={64}
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      placeholder="What's on your mind? (e.g. Hacking on Discordia ✨)"
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '10px 36px 10px 12px',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {customStatus && (
                      <button
                        type="button"
                        onClick={() => setCustomStatus('')}
                        aria-label="Clear custom status"
                        style={{
                          position: 'absolute',
                          right: 10,
                          background: 'none',
                          border: 'none',
                          color: '#949ba4',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 2,
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: customStatus ? '#dbdee1' : '#949ba4' }}>
                    {customStatus ? `"${customStatus}"` : 'No custom status set.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default OwnProfileView;
