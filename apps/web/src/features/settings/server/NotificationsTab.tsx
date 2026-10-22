
import type { ServerSettingsState } from './useServerSettingsState';
import styles from './NotificationsTab.module.css';

/** Pestaña "notifications" de ServerSettings. */
export function NotificationsTab({ s }: { s: ServerSettingsState }) {
  const {
    notifPreference,
    setNotifPreference,
    isServerMuted,
    setIsServerMuted,
    muteDuration,
    setMuteDuration,
    suppressEveryone,
    setSuppressEveryone,
  } = s;
  return (
    <div className={styles.root}>
      <h3 className={styles.serverNotificationSettings}>
        Server Notification Settings
      </h3>

      {/* Notification Frequency Radio */}
      <div className={styles.notificationFrequencyRadio}>
        <label className={styles.defaultNotificationFrequency}>
          Default Notification Frequency
        </label>
        {(
          [
            { id: 'all', title: 'All Messages', desc: 'Notify on every message sent in any channel.' },
            { id: 'mentions', title: 'Only @mentions', desc: 'Recommended: Only alert when specifically tagged.' },
            { id: 'nothing', title: 'Nothing', desc: 'Suppress all notifications from this server.' },
          ] as const
        ).map((option) => (
          <label
            key={option.id}
            className={styles.notificationFrequencyRadioLabel}
          >
            <input
              type="radio"
              name="serverNotifs"
              checked={notifPreference === option.id}
              onChange={() => setNotifPreference(option.id)}
              className={styles.notificationFrequencyRadioLabelInput}
            />
            <div>
              <div className={styles.notificationFrequencyRadioLabelDiv}>{option.title}</div>
              <div className={styles.notificationFrequencyRadioLabelDiv2}>{option.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Server Mute Switch */}
      <div className={styles.serverMuteSwitch}>
        <div>
          <div className={styles.notificationFrequencyRadioLabelDiv}>Mute Server</div>
          <div className={styles.serverMuteSwitchDiv}>
            Temporarily silence notifications without leaving the server.
          </div>
        </div>
        <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
          <input
            type="checkbox"
            checked={isServerMuted}
            onChange={(e) => setIsServerMuted(e.target.checked)}
            className={styles.serverMuteSwitchInput}
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
              backgroundColor: isServerMuted ? 'var(--status-online)' : 'var(--status-offline)',
              borderRadius: 24,
              transition: '0.2s',
            }}
          >
            <span
              className={styles.serverMuteSwitchSpan} style={{ left: isServerMuted ? 19 : 3 }}
            />
          </span>
        </label>
      </div>

      {isServerMuted && (
        <div>
          <label className={styles.muteDuration}>
            Mute Duration
          </label>
          <select
            value={muteDuration}
            onChange={(e) => setMuteDuration(e.target.value)}
            className={styles.rootSelect}
          >
            <option value="15_min">For 15 Minutes</option>
            <option value="1_hour">For 1 Hour</option>
            <option value="8_hours">For 8 Hours</option>
            <option value="24_hours">For 24 Hours</option>
            <option value="until_turn_on">Until I turn it back on</option>
          </select>
        </div>
      )}

      {/* Suppress @everyone */}
      <div className={styles.serverMuteSwitch}>
        <div>
          <div className={styles.notificationFrequencyRadioLabelDiv}>
            Suppress @everyone and @here
          </div>
          <div className={styles.serverMuteSwitchDiv}>
            Mute all broadcast mentions regardless of member permissions.
          </div>
        </div>
        <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
          <input
            type="checkbox"
            checked={suppressEveryone}
            onChange={(e) => setSuppressEveryone(e.target.checked)}
            className={styles.serverMuteSwitchInput}
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
              backgroundColor: suppressEveryone ? 'var(--status-online)' : 'var(--status-offline)',
              borderRadius: 24,
              transition: '0.2s',
            }}
          >
            <span
              className={styles.serverMuteSwitchSpan} style={{ left: suppressEveryone ? 19 : 3 }}
            />
          </span>
        </label>
      </div>
    </div>
  );
}
