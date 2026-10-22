
import {
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import type { UserSettingsState } from './useUserSettingsState';
import styles from './PremiumTab.module.css';

/** Pestaña "premium" de UserSettings. */
export function PremiumTab({ s }: { s: UserSettingsState }) {
  const {
    isPremium,
    billingCycle,
    setBillingCycle,
    paymentStatus,
    handleSubscribePremium,
    handleCancelPremium,
  } = s;
  return (
    <div className={styles.root}>
      {/* Hero Card */}
      <div className={styles.heroCard}>
        <div className={styles.heroCardDiv}>
          <Sparkles size={28} />
          <h3 className={styles.discordiaPremium}>Discordia Premium</h3>
        </div>
        <p className={styles.heroCardP}>
          Supercharge your Discordia experience with enhanced streaming, massive uploads, and free server boosts.
        </p>

        <div className={styles.heroCardDiv2}>
          {isPremium ? (
            <span className={styles.heroCardDiv2Span}>
              <Check size={16} color="#23a55a" /> Active Subscriber
            </span>
          ) : (
            <span className={styles.freePlan}>
              Free Plan
            </span>
          )}
        </div>
      </div>

      {/* Billing Cycle Selector */}
      <div className={styles.billingCycleSelector}>
        <div className={styles.billingCycleSelectorDiv}>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={styles.monthly999Mo} style={{ backgroundColor: billingCycle === 'monthly' ? 'var(--brand)' : 'transparent' }}
          >
            Monthly ($9.99/mo)
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={styles.monthly999Mo} style={{ backgroundColor: billingCycle === 'yearly' ? 'var(--brand)' : 'transparent' }}
          >
            Yearly ($99.99/yr - Save 16%)
          </button>
        </div>
      </div>

      {/* Feature Comparison List */}
      <div className={styles.featureComparisonList}>
        <div className={styles.includedBenefits}>Included Benefits</div>
        {[
          'HD 1080p 60FPS Video Streaming & Screen Sharing',
          '50MB file attachment uploads (vs 10MB default)',
          '2 Server Boosts included every month ($10.00 value)',
          'Custom emojis usable across any server or private DM',
          'Special Discordia Nitro profile badge and animated avatars',
          'Double character limit: up to 4,000 characters per message',
        ].map((feat, i) => (
          <div key={i} className={styles.featureComparisonListDiv}>
            <Check size={18} color="#2dc770" />
            <span className={styles.featureComparisonListDivSpan}>{feat}</span>
          </div>
        ))}

        {/* Payment CTA */}
        <div className={styles.paymentCta}>
          {!isPremium ? (
            <button
              type="button"
              onClick={handleSubscribePremium}
              disabled={paymentStatus === 'paying'}
              className={styles.paymentCtaButton} style={{ cursor: paymentStatus === 'paying' ? 'not-allowed' : 'pointer' }}
            >
              {paymentStatus === 'paying' ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing Payment...
                </>
              ) : paymentStatus === 'success' ? (
                <>
                  <Check size={18} />
                  Subscribed!
                </>
              ) : (
                `Subscribe Now (${billingCycle === 'monthly' ? '$9.99/mo' : '$99.99/yr'})`
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelPremium}
              className={styles.cancelPremiumSubscription}
            >
              Cancel Premium Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
