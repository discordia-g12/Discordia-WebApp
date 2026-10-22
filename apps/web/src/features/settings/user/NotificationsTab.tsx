
import type { UserSettingsState } from './useUserSettingsState';
import styles from './NotificationsTab.module.css';

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
    <div className={styles.root}>
      <h3 className={styles.appNotificationPreferences}>
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
          className={styles.rootDiv}
        >
          <div>
            <div className={styles.rootDivDiv}>{toggle.title}</div>
            <div className={styles.rootDivDiv2}>{toggle.desc}</div>
          </div>
          <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
            <input
              type="checkbox"
              checked={toggle.checked}
              onChange={(e) => toggle.setter(e.target.checked)}
              className={styles.rootDivInput}
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
                backgroundColor: toggle.checked ? 'var(--status-online)' : 'var(--status-offline)',
                borderRadius: 24,
                transition: '0.2s',
              }}
            >
              <span
                className={styles.rootDivSpan} style={{ left: toggle.checked ? 19 : 3 }}
              />
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}
