
import type { ServerSettingsState } from './useServerSettingsState';

/** Pestaña "moderation" de ServerSettings. */
export function ModerationTab({ s }: { s: ServerSettingsState }) {
  const {
    explicitFilter,
    setExplicitFilter,
    spamFilter,
    setSpamFilter,
    requireEmail,
    setRequireEmail,
    require2FA,
    setRequire2FA,
    blockedWords,
    setBlockedWords,
  } = s;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
        Content Filters & Auto-Moderation
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Explicit Filter */}
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
              Explicit Media Content Filter
            </div>
            <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
              Automatically scan and block media uploads containing adult or violent content.
            </div>
          </div>
          <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
            <input
              type="checkbox"
              checked={explicitFilter}
              onChange={(e) => setExplicitFilter(e.target.checked)}
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
                backgroundColor: explicitFilter ? '#23a55a' : '#80848e',
                borderRadius: 24,
                transition: '0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  height: 18,
                  width: 18,
                  left: explicitFilter ? 19 : 3,
                  bottom: 3,
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  transition: '0.2s',
                }}
              />
            </span>
          </label>
        </div>

        {/* Spam Filter */}
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
              Anti-Spam Rate Limiter
            </div>
            <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
              Quarantine accounts sending repeated high-frequency messages or mention flooding.
            </div>
          </div>
          <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
            <input
              type="checkbox"
              checked={spamFilter}
              onChange={(e) => setSpamFilter(e.target.checked)}
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
                backgroundColor: spamFilter ? '#23a55a' : '#80848e',
                borderRadius: 24,
                transition: '0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  height: 18,
                  width: 18,
                  left: spamFilter ? 19 : 3,
                  bottom: 3,
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  transition: '0.2s',
                }}
              />
            </span>
          </label>
        </div>

        {/* Require Email */}
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
              Require Verified Email
            </div>
            <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
              Members must have a verified email linked to their Discordia account to post.
            </div>
          </div>
          <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
            <input
              type="checkbox"
              checked={requireEmail}
              onChange={(e) => setRequireEmail(e.target.checked)}
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
                backgroundColor: requireEmail ? '#23a55a' : '#80848e',
                borderRadius: 24,
                transition: '0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  height: 18,
                  width: 18,
                  left: requireEmail ? 19 : 3,
                  bottom: 3,
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  transition: '0.2s',
                }}
              />
            </span>
          </label>
        </div>

        {/* Require 2FA */}
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
              Require 2FA for Moderation Roles
            </div>
            <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
              Requires two-factor authentication to perform administrative actions.
            </div>
          </div>
          <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
            <input
              type="checkbox"
              checked={require2FA}
              onChange={(e) => setRequire2FA(e.target.checked)}
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
                backgroundColor: require2FA ? '#23a55a' : '#80848e',
                borderRadius: 24,
                transition: '0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  height: 18,
                  width: 18,
                  left: require2FA ? 19 : 3,
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

      {/* Blocked Words Textarea */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#b5bac1',
            marginBottom: 8,
          }}
        >
          Prohibited Words (Comma-Separated)
        </label>
        <textarea
          rows={3}
          value={blockedWords}
          onChange={(e) => setBlockedWords(e.target.value)}
          placeholder="word1, phrase2, malicious-link"
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
    </div>
  );
}
