
import {
  Sparkles,
  Check,
} from 'lucide-react';
import type { ServerSettingsState } from './useServerSettingsState';
import styles from './BoostTab.module.css';

/** Pestaña "boost" de ServerSettings. */
export function BoostTab({ s }: { s: ServerSettingsState }) {
  const {
    serverState,
    userPoints,
    userBoostedCount,
    boostFeedback,
    handleBoostServer,
    handleRetractBoost,
  } = s;
  return (
    <div className={styles.root}>
      {/* Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroBannerDiv}>
          <div className={styles.heroBannerDivDiv}>
            <Sparkles size={24} color="#ffffff" />
          </div>
          <div>
            <h3 className={styles.heroBannerDivH3}>
              Server Boost — Level {serverState.boostLevel}
            </h3>
            <span className={styles.heroBannerDivSpan}>
              {serverState.boostCount} boosts helping unlock perks and enhanced bandwidth!
            </span>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div>
          <div className={styles.progressNextLevelDiv}>
            <span>Level {serverState.boostLevel}</span>
            <span>Next: Level {Math.min(3, serverState.boostLevel + 1)} ({serverState.boostCount}/7 Boosts)</span>
          </div>
          <div className={styles.progressNextLevelDiv2}>
            <div
              className={styles.progressNextLevelDiv2Div} style={{ width: `${Math.min(100, (serverState.boostCount / 7) * 100)}%` }}
            />
          </div>
        </div>

        {/* Feedback Message */}
        {boostFeedback && (
          <div className={styles.heroBannerDiv2}>
            <Check size={16} />
            {boostFeedback}
          </div>
        )}

        {/* Actions & Points Balance */}
        <div className={styles.actionsPointsBalance}>
          <div className={styles.actionsPointsBalanceDiv}>
            <span className={styles.yourWalletBalance}>Your Wallet Balance:</span>
            <span className={styles.actionsPointsBalanceDivSpan}>
              💠 {userPoints} Points
            </span>
          </div>

          <div className={styles.actionsPointsBalanceDiv2}>
            {userBoostedCount > 0 && (
              <button
                type="button"
                onClick={handleRetractBoost}
                className={styles.retractBoost}
              >
                Retract Boost
              </button>
            )}

            <button
              type="button"
              onClick={handleBoostServer}
              className={styles.actionsPointsBalanceDiv2Button}
            >
              <Sparkles size={16} /> Boost Server (500 💠)
            </button>
          </div>
        </div>
      </div>

      {/* Boost Perks Table */}
      <div>
        <h4 className={styles.unlockedLevelPerks}>
          Unlocked Level Perks
        </h4>

        <div className={styles.boostPerksTableDiv}>
          <div
            className={styles.boostPerksTableDivDiv} style={{ borderRadius: 8, border: serverState.boostLevel >= 1 ? '2px solid var(--legacy-boost-pink)' : '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            <div className={styles.level12Boosts}>Level 1 (2 Boosts)</div>
            <ul className={styles.boostPerksTableDivDivUl}>
              <li>+50 Extra Emoji Slots</li>
              <li>128 Kbps Audio Quality</li>
              <li>Custom Server Invite Background</li>
            </ul>
          </div>

          <div
            className={styles.boostPerksTableDivDiv} style={{ borderRadius: 8, border: serverState.boostLevel >= 2 ? '2px solid var(--legacy-boost-pink)' : '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            <div className={styles.level12Boosts}>Level 2 (4 Boosts)</div>
            <ul className={styles.boostPerksTableDivDivUl}>
              <li>+100 Extra Emoji Slots</li>
              <li>256 Kbps Audio Quality</li>
              <li>50MB Upload Limit for all members</li>
              <li>1080p 60FPS Streams</li>
            </ul>
          </div>

          <div
            className={styles.boostPerksTableDivDiv} style={{ borderRadius: 8, border: serverState.boostLevel >= 3 ? '2px solid var(--legacy-boost-pink)' : '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            <div className={styles.level12Boosts}>Level 3 (7 Boosts)</div>
            <ul className={styles.boostPerksTableDivDivUl}>
              <li>+150 Extra Emoji Slots</li>
              <li>384 Kbps Audio Quality</li>
              <li>100MB Upload Limit</li>
              <li>Custom Vanity URL</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
