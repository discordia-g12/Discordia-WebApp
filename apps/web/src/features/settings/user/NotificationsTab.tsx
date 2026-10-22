
import type { UserSettingsState } from './useUserSettingsState';

/** Pestaña "notifications" de UserSettings. */
export function NotificationsTab({ s }: { s: UserSettingsState }) {
  const {
    enableDesktop,
    setEnableDesktop,
    enableBadge,
    setEnableBadge,
    enableSounds,
    setEnableSounds,
    previewContent,
    setPreviewContent,
  } = s;
  return (
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
  );
}
