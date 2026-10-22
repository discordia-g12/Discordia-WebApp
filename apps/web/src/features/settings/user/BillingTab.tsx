
import {
  Check,
  Loader2,
} from 'lucide-react';
import type { UserSettingsState } from './useUserSettingsState';

/** Pestaña "billing" de UserSettings. */
export function BillingTab({ s }: { s: UserSettingsState }) {
  const { points, purchasingPackage, billingFeedback, handleBuyPoints } = s;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Points Balance Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 24,
          backgroundColor: '#2b2d31',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#949ba4' }}>
            Current Wallet Balance
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f2f3f5', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span>💠</span>
            <span>{points.toLocaleString()} Points</span>
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#949ba4', textAlign: 'right' }}>
          Used for Server Boosts (500 💠)<br />and custom emojis.
        </div>
      </div>

      {billingFeedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(35, 165, 90, 0.15)',
            border: '1px solid #23a55a',
            borderRadius: 6,
            padding: '10px 14px',
            color: '#2dc770',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Check size={16} />
          {billingFeedback}
        </div>
      )}

      {/* Points Store Grid */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', marginBottom: 16 }}>
          Purchase Points Packs
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {[
            { points: 500, price: '$4.99', badge: null },
            { points: 1000, price: '$9.49', badge: '5% OFF' },
            { points: 2500, price: '$21.99', badge: '12% OFF' },
            { points: 5000, price: '$39.99', badge: 'BEST VALUE' },
          ].map((pack) => (
            <div
              key={pack.points}
              style={{
                backgroundColor: '#2b2d31',
                borderRadius: 8,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                border: pack.badge === 'BEST VALUE' ? '2px solid #5865f2' : '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              {pack.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: -10,
                    backgroundColor: '#5865f2',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  {pack.badge}
                </span>
              )}

              <div style={{ fontSize: 28, marginBottom: 8 }}>💠</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f2f3f5' }}>
                {pack.points.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: '#949ba4', marginBottom: 16 }}>Points</div>

              <button
                type="button"
                onClick={() => handleBuyPoints(pack.points)}
                disabled={purchasingPackage === pack.points}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  backgroundColor: '#5865f2',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: purchasingPackage === pack.points ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
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
