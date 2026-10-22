
import {
  Lock,
  Circle,
} from 'lucide-react';
import { STATUS_CONFIG } from './shared';
import type { UserSettingsState } from './useUserSettingsState';

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
  );
}
