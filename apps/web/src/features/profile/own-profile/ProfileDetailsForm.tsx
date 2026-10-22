
import {
  Camera,
  Trash2,
  Check,
  X,
  Circle,
} from 'lucide-react';
import { Avatar } from '../../../ui/Avatar';
import { PRESET_BANNER_COLORS, STATUS_CONFIG } from './shared';
import type { OwnProfileState } from './useOwnProfileState';

/** Sección "Right Column: Edit / View Form Details" de OwnProfileView. */
export function ProfileDetailsForm({ s }: { s: OwnProfileState }) {
  const {
    baseUser,
    mode,
    displayName,
    setDisplayName,
    bio,
    setBio,
    status,
    setStatus,
    customStatus,
    setCustomStatus,
    bannerColor,
    setBannerColor,
    avatarUrl,
    isDisplayNameValid,
    handleAvatarFileChange,
    handleResetAvatar,
  } = s;
  return (
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
  );
}
