
import {
  Lock,
  Circle,
} from 'lucide-react';
import { STATUS_CONFIG } from './shared';
import type { UserSettingsState } from './useUserSettingsState';
import styles from './ProfileTab.module.css';

/** Pestaña "profile" de UserSettings. */
export function ProfileTab({ s }: { s: UserSettingsState }) {
  const {
    baseUser,
    displayName,
    setDisplayName,
    bio,
    setBio,
    status,
    setStatus,
    customStatus,
    setCustomStatus,
    handleSaveProfile,
  } = s;
  return (
    <div className={styles.root}>
      {/* Account Card */}
      <div className={styles.accountCard}>
        <div
          className={styles.accountCardDiv} style={{ backgroundColor: baseUser.bannerColor || 'var(--brand)' }}
        />
        <div className={styles.accountCardDiv2}>
          <div className={styles.accountCardDiv2Div}>
            <img
              src={baseUser.avatarUrl || baseUser.avatar || ''}
              alt={displayName}
              className={styles.accountCardDiv2DivImg}
            />
            <div className={styles.accountCardDiv2DivDiv}>
              User ID: <code>{baseUser.id}</code>
            </div>
          </div>

          <div className={styles.accountCardDiv2Div2}>
            <div className={styles.accountCardDiv2Div2Div}>{displayName}</div>
            <div className={styles.accountCardDiv2DivDiv}>@{baseUser.username}</div>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className={styles.formFields}>
        {/* Display Name */}
        <div>
          <label className={styles.displayName}>
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            maxLength={32}
            onChange={(e) => setDisplayName(e.target.value)}
            className={styles.displayNameInput}
          />
        </div>

        {/* Username (Locked) */}
        <div>
          <div className={styles.usernameLockedDiv}>
            <label className={styles.username}>
              Username
            </label>
            <Lock size={13} color="#949ba4" />
            <span className={styles.usernameLockedDivSpan}>
              (Usernames are immutable platform identifiers)
            </span>
          </div>
          <input
            type="text"
            disabled
            value={`@${baseUser.username}`}
            className={styles.usernameLockedInput}
          />
        </div>

        {/* Bio */}
        <div>
          <div className={styles.bioDiv}>
            <label className={styles.username}>
              About Me (Bio)
            </label>
            <span className={styles.bioDivSpan}>{bio.length}/190</span>
          </div>
          <textarea
            rows={3}
            maxLength={190}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={styles.bioTextarea}
          />
        </div>

        {/* Presence Status */}
        <div>
          <label className={styles.status}>
            Status
          </label>
          <div className={styles.presenceStatusDiv}>
            {(['online', 'idle', 'dnd', 'invisible'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={styles.presenceStatusDivButton} style={{ backgroundColor: status === st ? 'rgba(255, 255, 255, 0.1)' : 'var(--bg-tertiary)', border: status === st ? `2px solid ${STATUS_CONFIG[st].color}` : '1px solid rgba(0,0,0,0.3)', borderRadius: 6 }}
              >
                <Circle size={10} fill={STATUS_CONFIG[st].color} strokeWidth={0} />
                <span className={styles.presenceStatusDivButtonSpan}>{STATUS_CONFIG[st].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Status */}
        <div>
          <label className={styles.displayName}>
            Custom Status
          </label>
          <input
            type="text"
            maxLength={64}
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            placeholder="What are you up to?"
            className={styles.displayNameInput}
          />
        </div>

        {/* Save Profile Button */}
        <div>
          <button
            type="button"
            onClick={handleSaveProfile}
            className={styles.saveChanges}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
