
import {
  Check,
  Loader2,
} from 'lucide-react';
import type { UserSettingsState } from './useUserSettingsState';
import styles from './BillingTab.module.css';

/** Pestaña "billing" de UserSettings. */
export function BillingTab({ s }: { s: UserSettingsState }) {
  const { points, purchasingPackage, billingFeedback, handleBuyPoints } = s;
  return (
    <div className={styles.root}>
      {/* Points Balance Card */}
      <div className={styles.pointsBalanceCard}>
        <div>
          <div className={styles.currentWalletBalance}>
            Current Wallet Balance
          </div>
          <div className={styles.pointsBalanceCardDiv}>
            <span>💠</span>
            <span>{points.toLocaleString()} Points</span>
          </div>
        </div>

        <div className={styles.pointsBalanceCardDiv2}>
          Used for Server Boosts (500 💠)<br />and custom emojis.
        </div>
      </div>

      {billingFeedback && (
        <div className={styles.rootDiv}>
          <Check size={16} />
          {billingFeedback}
        </div>
      )}

      {/* Points Store Grid */}
      <div>
        <h3 className={styles.purchasePointsPacks}>
          Purchase Points Packs
        </h3>

        <div className={styles.pointsStoreGridDiv}>
          {[
            { points: 500, price: '$4.99', badge: null },
            { points: 1000, price: '$9.49', badge: '5% OFF' },
            { points: 2500, price: '$21.99', badge: '12% OFF' },
            { points: 5000, price: '$39.99', badge: 'BEST VALUE' },
          ].map((pack) => (
            <div
              key={pack.points}
              className={styles.pointsStoreGridDivDiv} style={{ borderRadius: 8, border: pack.badge === 'BEST VALUE' ? '2px solid var(--brand)' : '1px solid rgba(255, 255, 255, 0.05)' }}
            >
              {pack.badge && (
                <span className={styles.pointsStoreGridDivDivSpan}>
                  {pack.badge}
                </span>
              )}

              <div className={styles.pointsStoreGridDivDivDiv}>💠</div>
              <div className={styles.pointsStoreGridDivDivDiv2}>
                {pack.points.toLocaleString()}
              </div>
              <div className={styles.points}>Points</div>

              <button
                type="button"
                onClick={() => handleBuyPoints(pack.points)}
                disabled={purchasingPackage === pack.points}
                className={styles.pointsStoreGridDivDivButton} style={{ cursor: purchasingPackage === pack.points ? 'not-allowed' : 'pointer' }}
              >
                {purchasingPackage === pack.points ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  pack.price
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
