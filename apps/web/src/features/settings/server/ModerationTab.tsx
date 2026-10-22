
import type { ServerSettingsState } from './useServerSettingsState';
import styles from './ModerationTab.module.css';

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
    <div className={styles.root}>
      <h3 className={styles.rootH3}>
        Content Filters & Auto-Moderation
      </h3>

      <div className={styles.rootDiv}>
        {/* Explicit Filter */}
        <div className={styles.explicitFilter}>
          <div>
            <div className={styles.explicitMediaContentFilter}>
              Explicit Media Content Filter
            </div>
            <div className={styles.explicitFilterDiv}>
              Automatically scan and block media uploads containing adult or violent content.
            </div>
          </div>
          <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
            <input
              type="checkbox"
              checked={explicitFilter}
              onChange={(e) => setExplicitFilter(e.target.checked)}
              className={styles.explicitFilterInput}
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
                backgroundColor: explicitFilter ? 'var(--status-online)' : 'var(--status-offline)',
                borderRadius: 24,
                transition: '0.2s',
              }}
            >
              <span
                className={styles.explicitFilterSpan} style={{ left: explicitFilter ? 19 : 3 }}
              />
            </span>
          </label>
        </div>

        {/* Spam Filter */}
        <div className={styles.explicitFilter}>
          <div>
            <div className={styles.explicitMediaContentFilter}>
              Anti-Spam Rate Limiter
            </div>
            <div className={styles.explicitFilterDiv}>
              Quarantine accounts sending repeated high-frequency messages or mention flooding.
            </div>
          </div>
          <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
            <input
              type="checkbox"
              checked={spamFilter}
              onChange={(e) => setSpamFilter(e.target.checked)}
              className={styles.explicitFilterInput}
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
                backgroundColor: spamFilter ? 'var(--status-online)' : 'var(--status-offline)',
                borderRadius: 24,
                transition: '0.2s',
              }}
            >
              <span
                className={styles.explicitFilterSpan} style={{ left: spamFilter ? 19 : 3 }}
              />
            </span>
          </label>
        </div>

        {/* Require Email */}
        <div className={styles.explicitFilter}>
          <div>
            <div className={styles.explicitMediaContentFilter}>
              Require Verified Email
            </div>
            <div className={styles.explicitFilterDiv}>
              Members must have a verified email linked to their Discordia account to post.
            </div>
          </div>
          <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
            <input
              type="checkbox"
              checked={requireEmail}
              onChange={(e) => setRequireEmail(e.target.checked)}
              className={styles.explicitFilterInput}
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
                backgroundColor: requireEmail ? 'var(--status-online)' : 'var(--status-offline)',
                borderRadius: 24,
                transition: '0.2s',
              }}
            >
              <span
                className={styles.explicitFilterSpan} style={{ left: requireEmail ? 19 : 3 }}
              />
            </span>
          </label>
        </div>

        {/* Require 2FA */}
        <div className={styles.explicitFilter}>
          <div>
            <div className={styles.explicitMediaContentFilter}>
              Require 2FA for Moderation Roles
            </div>
            <div className={styles.explicitFilterDiv}>
              Requires two-factor authentication to perform administrative actions.
            </div>
          </div>
          <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
            <input
              type="checkbox"
              checked={require2FA}
              onChange={(e) => setRequire2FA(e.target.checked)}
              className={styles.explicitFilterInput}
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
                backgroundColor: require2FA ? 'var(--status-online)' : 'var(--status-offline)',
                borderRadius: 24,
                transition: '0.2s',
              }}
            >
              <span
                className={styles.explicitFilterSpan} style={{ left: require2FA ? 19 : 3 }}
              />
            </span>
          </label>
        </div>
      </div>

      {/* Blocked Words Textarea */}
      <div>
        <label className={styles.blockedWordsTextareaLabel}>
          Prohibited Words (Comma-Separated)
        </label>
        <textarea
          rows={3}
          value={blockedWords}
          onChange={(e) => setBlockedWords(e.target.value)}
          placeholder="word1, phrase2, malicious-link"
          className={styles.word1Phrase2MaliciousLink}
        />
      </div>
    </div>
  );
}
