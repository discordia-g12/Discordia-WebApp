
import {
  Camera,
  Trash2,
  Check,
  X,
  Circle,
} from 'lucide-react';
import { Avatar } from '../../../ui/legacy/Avatar';
import { PRESET_BANNER_COLORS, STATUS_CONFIG } from './shared';
import type { OwnProfileState } from './useOwnProfileState';
import styles from './ProfileDetailsForm.module.css';

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
    <main className={styles.root}>
      <div className={styles.rootDiv}>
        <h2 className={styles.rootDivH2}>
          {mode === 'view' ? 'Profile Overview' : 'Edit Profile Information'}
        </h2>
        <p className={styles.rootDivP}>
          Customize your public persona on Discordia. Changes will be reflected across your servers and direct messages.
        </p>

        <div className={styles.rootDivDiv}>
          {/* SECTION 1: AVATAR */}
          <div className={styles.section1Avatar}>
            <label className={styles.avatar}>
              Avatar
            </label>
            <div className={styles.section1AvatarDiv}>
              <Avatar user={{ ...baseUser, avatar: avatarUrl } as any} size={72} />
              {mode !== 'view' ? (
                <div className={styles.section1AvatarDivDiv}>
                  <label className={styles.section1AvatarDivDivLabel}>
                    <Camera size={16} />
                    Change Avatar
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleAvatarFileChange}
                      className={styles.section1AvatarDivDivLabelInput}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className={styles.section1AvatarDivDivButton}
                  >
                    <Trash2 size={16} />
                    Remove Custom
                  </button>
                </div>
              ) : (
                <span className={styles.section1AvatarDivSpan}>
                  Click &ldquo;Edit Profile&rdquo; to upload a new avatar or restore default.
                </span>
              )}
            </div>
          </div>

          {/* SECTION 2: BANNER COLOR */}
          <div className={styles.section1Avatar}>
            <label className={styles.avatar}>
              Banner Color
            </label>
            {mode !== 'view' ? (
              <div>
                <div className={styles.section1AvatarDiv2}>
                  {PRESET_BANNER_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setBannerColor(col)}
                      className={styles.section1AvatarDiv2Button} style={{ borderRadius: '50%', backgroundColor: col, border: bannerColor.toLowerCase() === col.toLowerCase() ? '3px solid var(--text-white)' : '2px solid rgba(0,0,0,0.3)' }}
                    >
                      {bannerColor.toLowerCase() === col.toLowerCase() && <Check size={16} color="#ffffff" />}
                    </button>
                  ))}

                  {/* Native Color Picker input */}
                  <label
                    title="Custom Color Picker"
                    className={styles.nativeColorPickerInput}
                  >
                    <input
                      type="color"
                      value={bannerColor}
                      onChange={(e) => setBannerColor(e.target.value)}
                      className={styles.nativeColorPickerInputInput}
                    />
                    <span>Custom ({bannerColor.toUpperCase()})</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className={styles.section1AvatarDiv3}>
                <div
                  className={styles.section1AvatarDiv3Div} style={{ backgroundColor: bannerColor }}
                />
                <span className={styles.section1AvatarDiv3Span}>{bannerColor.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* SECTION 3: DISPLAY NAME */}
          <div className={styles.section1Avatar}>
            <div className={styles.section1AvatarDiv4}>
              <label className={styles.displayName}>
                Display Name
              </label>
              <span className={styles.section1AvatarDiv4Span} style={{ color: displayName.length > 32 ? 'var(--text-danger)' : 'var(--text-muted)' }}>
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
                  className={styles.enterDisplayName} style={{ border: isDisplayNameValid ? '1px solid rgba(0, 0, 0, 0.3)' : '1px solid var(--danger)', borderRadius: 4 }}
                />
                {!isDisplayNameValid && (
                  <span className={styles.section1AvatarSpan}>
                    Display name must be between 2 and 32 characters.
                  </span>
                )}
              </div>
            ) : (
              <div className={styles.section1AvatarDiv5}>{displayName}</div>
            )}
          </div>

          {/* SECTION 4: ABOUT ME (BIO) */}
          <div className={styles.section1Avatar}>
            <div className={styles.section1AvatarDiv4}>
              <label className={styles.displayName}>
                About Me (Bio)
              </label>
              <span className={styles.section1AvatarDiv4Span} style={{ color: bio.length > 190 ? 'var(--text-danger)' : 'var(--text-muted)' }}>
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
                className={styles.tellEveryoneLittleBit}
              />
            ) : (
              <div className={styles.section1AvatarDiv6}>{bio || 'No bio provided.'}</div>
            )}
          </div>

          {/* SECTION 5: ONLINE STATUS */}
          <div className={styles.section1Avatar}>
            <label className={styles.avatar}>
              Presence Status
            </label>

            {mode !== 'view' ? (
              <div className={styles.section1AvatarDiv7}>
                {(['online', 'idle', 'dnd', 'invisible'] as const).map((st) => {
                  const cfg = STATUS_CONFIG[st];
                  const isSelected = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={styles.section1AvatarDiv7Button} style={{ backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'var(--bg-tertiary)', border: isSelected ? `2px solid ${cfg.color}` : '1px solid rgba(0,0,0,0.3)', borderRadius: 6, color: isSelected ? 'var(--text-white)' : 'var(--header-secondary)' }}
                    >
                      <Circle size={10} fill={cfg.color} strokeWidth={0} />
                      <span className={styles.section1AvatarDiv7ButtonSpan} style={{ fontWeight: isSelected ? 600 : 400 }}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.section1AvatarDiv8}>
                <Circle
                  size={12}
                  fill={STATUS_CONFIG[status as 'online' | 'idle' | 'dnd' | 'invisible']?.color || '#80848e'}
                  strokeWidth={0}
                />
                <span className={styles.section1AvatarDiv8Span}>
                  {STATUS_CONFIG[status as 'online' | 'idle' | 'dnd' | 'invisible']?.label || 'Offline'}
                </span>
              </div>
            )}
          </div>

          {/* SECTION 6: CUSTOM STATUS */}
          <div>
            <div className={styles.section1AvatarDiv4}>
              <label className={styles.displayName}>
                Custom Status
              </label>
              <span className={styles.section1AvatarDiv4Span} style={{ color: customStatus.length > 64 ? 'var(--text-danger)' : 'var(--text-muted)' }}>
                {customStatus.length}/64
              </span>
            </div>

            {mode !== 'view' ? (
              <div className={styles.section6CustomStatusDiv}>
                <input
                  type="text"
                  maxLength={64}
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="What's on your mind? (e.g. Hacking on Discordia ✨)"
                  className={styles.whatSOnYour}
                />
                {customStatus && (
                  <button
                    type="button"
                    onClick={() => setCustomStatus('')}
                    aria-label="Clear custom status"
                    className={styles.clearCustomStatus}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.section6CustomStatusDiv2} style={{ color: customStatus ? 'var(--text-normal)' : 'var(--text-muted)' }}>
                {customStatus ? `"${customStatus}"` : 'No custom status set.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
