
import type { ServerSettingsState } from './useServerSettingsState';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
        Server Notification Settings
      </h3>

      {/* Notification Frequency Radio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1' }}>
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              backgroundColor: '#2b2d31',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="serverNotifs"
              checked={notifPreference === option.id}
              onChange={() => setNotifPreference(option.id)}
              style={{ accentColor: '#5865f2', width: 16, height: 16 }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>{option.title}</div>
              <div style={{ fontSize: 12, color: '#949ba4' }}>{option.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Server Mute Switch */}
      <div
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
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>Mute Server</div>
          <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
            Temporarily silence notifications without leaving the server.
          </div>
        </div>
        <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
          <input
            type="checkbox"
            checked={isServerMuted}
            onChange={(e) => setIsServerMuted(e.target.checked)}
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
              backgroundColor: isServerMuted ? '#23a55a' : '#80848e',
              borderRadius: 24,
              transition: '0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                height: 18,
                width: 18,
                left: isServerMuted ? 19 : 3,
                bottom: 3,
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: '0.2s',
              }}
            />
          </span>
        </label>
      </div>

      {isServerMuted && (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
            Mute Duration
          </label>
          <select
            value={muteDuration}
            onChange={(e) => setMuteDuration(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1e1f22',
              color: '#dbdee1',
              border: '1px solid rgba(0, 0, 0, 0.3)',
              borderRadius: 4,
              padding: '8px 10px',
              fontSize: 14,
              outline: 'none',
            }}
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
      <div
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
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>
            Suppress @everyone and @here
          </div>
          <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
            Mute all broadcast mentions regardless of member permissions.
          </div>
        </div>
        <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
          <input
            type="checkbox"
            checked={suppressEveryone}
            onChange={(e) => setSuppressEveryone(e.target.checked)}
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
              backgroundColor: suppressEveryone ? '#23a55a' : '#80848e',
              borderRadius: 24,
              transition: '0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                height: 18,
                width: 18,
                left: suppressEveryone ? 19 : 3,
                bottom: 3,
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: '0.2s',
              }}
            />
          </span>
        </label>
      </div>
    </div>
  );
}
