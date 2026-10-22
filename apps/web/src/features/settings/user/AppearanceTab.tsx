
import { Avatar } from '../../../ui/Avatar';
import type { UserSettingsState } from './useUserSettingsState';

/** Pestaña "appearance" de UserSettings. */
export function AppearanceTab({ s }: { s: UserSettingsState }) {
  const {
    baseUser,
    displayName,
    theme,
    setTheme,
    displayMode,
    setDisplayMode,
    fontSize,
    setFontSize,
  } = s;
  return (
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
  );
}
