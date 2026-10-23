
import { Avatar } from '../../../ui/legacy/Avatar';
import type { UserSettingsState } from './useUserSettingsState';
import styles from './AppearanceTab.module.css';

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
    <div className={styles.root}>
      {/* Theme Selector */}
      <div>
        <h3 className={styles.theme}>Theme</h3>
        <div className={styles.themeSelectorDiv}>
          {(['dark', 'light', 'auto'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={styles.themeSelectorDivButton} style={{ borderRadius: 8, border: theme === t ? '2px solid var(--brand)' : '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              <div
                className={styles.themeSelectorDivButtonDiv} style={{ backgroundColor: t === 'dark' ? 'var(--bg-tertiary)' : t === 'light' ? 'var(--header-primary)' : 'var(--brand)' }}
              />
              <span className={styles.themeSelectorDivButtonSpan}>{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Display Mode */}
      <div>
        <h3 className={styles.theme}>
          Message Display Mode
        </h3>
        <div className={styles.messageDisplayModeDiv}>
          <button
            type="button"
            onClick={() => setDisplayMode('cozy')}
            className={styles.messageDisplayModeDivButton} style={{ borderRadius: 8, border: displayMode === 'cozy' ? '2px solid var(--brand)' : '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <div className={styles.cozy}>Cozy</div>
            <div className={styles.messageDisplayModeDivButtonDiv}>
              Modern, spacious, with full-size user avatars.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode('compact')}
            className={styles.messageDisplayModeDivButton} style={{ borderRadius: 8, border: displayMode === 'compact' ? '2px solid var(--brand)' : '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <div className={styles.cozy}>Compact</div>
            <div className={styles.messageDisplayModeDivButtonDiv}>
              Dense layout for power users with inline timestamps.
            </div>
          </button>
        </div>
      </div>

      {/* Live Preview Box */}
      <div>
        <h4 className={styles.chatDisplayPreview}>
          Chat Display Preview
        </h4>
        <div
          className={styles.livePreviewBoxDiv} style={{ fontSize: fontSize }}
        >
          {displayMode === 'cozy' ? (
            <div className={styles.livePreviewBoxDivDiv}>
              <Avatar user={{ ...baseUser, avatar: baseUser.avatarUrl || baseUser.avatar || "" } as any} size={40} />
              <div>
                <div className={styles.livePreviewBoxDivDivDiv}>
                  <span className={styles.livePreviewBoxDivDivDivSpan}>{displayName}</span>
                  <span className={styles.todayAt1245}>Today at 12:45 PM</span>
                </div>
                <div className={styles.livePreviewBoxDivDivDiv2}>
                  Welcome to Discordia! The user interface adapts in real-time to your preferences.
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.livePreviewBoxDivDivDiv}>
              <span className={styles.todayAt1245}>[12:45 PM]</span>
              <span className={styles.livePreviewBoxDivDivDivSpan}>{displayName}:</span>
              <span className={styles.livePreviewBoxDivDivDivSpan2}>
                Compact mode gives you maximum line density and screen space.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Font Scaling Slider */}
      <div>
        <div className={styles.fontScalingSliderDiv}>
          <label className={styles.chatFontSize}>
            Chat Font Size
          </label>
          <span className={styles.fontScalingSliderDivSpan}>{fontSize}px</span>
        </div>
        <input
          type="range"
          min={12}
          max={18}
          step={1}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className={styles.fontScalingSliderInput}
        />
      </div>
    </div>
  );
}
