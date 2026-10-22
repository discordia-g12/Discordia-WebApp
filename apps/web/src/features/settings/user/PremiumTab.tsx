
import {
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import type { UserSettingsState } from './useUserSettingsState';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero Card */}
      <div
        style={{
          padding: 28,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
          boxShadow: '0 8px 32px rgba(88, 101, 242, 0.3)',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Sparkles size={28} />
          <h3 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Discordia Premium</h3>
        </div>
        <p style={{ fontSize: 15, margin: '0 0 16px 0', opacity: 0.9 }}>
          Supercharge your Discordia experience with enhanced streaming, massive uploads, and free server boosts.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isPremium ? (
            <span
              style={{
                backgroundColor: '#ffffff',
                color: '#2e3338',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Check size={16} color="#23a55a" /> Active Subscriber
            </span>
          ) : (
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Free Plan
            </span>
          )}
        </div>
      </div>

      {/* Billing Cycle Selector */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            backgroundColor: '#2b2d31',
            borderRadius: 8,
            padding: 4,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 18px',
              backgroundColor: billingCycle === 'monthly' ? '#5865f2' : 'transparent',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Monthly ($9.99/mo)
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 18px',
              backgroundColor: billingCycle === 'yearly' ? '#5865f2' : 'transparent',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Yearly ($99.99/yr - Save 16%)
          </button>
        </div>
      </div>

      {/* Feature Comparison List */}
      <div
        style={{
          backgroundColor: '#2b2d31',
          borderRadius: 8,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5' }}>Included Benefits</div>
        {[
          'HD 1080p 60FPS Video Streaming & Screen Sharing',
          '50MB file attachment uploads (vs 10MB default)',
          '2 Server Boosts included every month ($10.00 value)',
          'Custom emojis usable across any server or private DM',
          'Special Discordia Nitro profile badge and animated avatars',
          'Double character limit: up to 4,000 characters per message',
        ].map((feat, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Check size={18} color="#2dc770" />
            <span style={{ fontSize: 14, color: '#dbdee1' }}>{feat}</span>
          </div>
        ))}

        {/* Payment CTA */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isPremium ? (
            <button
              type="button"
              onClick={handleSubscribePremium}
              disabled={paymentStatus === 'paying'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 700,
                cursor: paymentStatus === 'paying' ? 'not-allowed' : 'pointer',
              }}
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
              style={{
                backgroundColor: 'transparent',
                color: '#fa777c',
                border: '1px solid rgba(218, 55, 60, 0.4)',
                padding: '10px 18px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel Premium Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
