
import {
  Sparkles,
  Check,
} from 'lucide-react';
import type { ServerSettingsState } from './useServerSettingsState';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero Banner */}
      <div
        style={{
          padding: '28px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(244, 127, 255, 0.2) 0%, rgba(88, 101, 242, 0.25) 100%)',
          border: '1px solid rgba(244, 127, 255, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f47fff 0%, #ff73fa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(244, 127, 255, 0.4)',
            }}
          >
            <Sparkles size={24} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
              Server Boost — Level {serverState.boostLevel}
            </h3>
            <span style={{ fontSize: 13, color: '#dbdee1' }}>
              {serverState.boostCount} boosts helping unlock perks and enhanced bandwidth!
            </span>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b5bac1', marginBottom: 6 }}>
            <span>Level {serverState.boostLevel}</span>
            <span>Next: Level {Math.min(3, serverState.boostLevel + 1)} ({serverState.boostCount}/7 Boosts)</span>
          </div>
          <div
            style={{
              height: 8,
              width: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (serverState.boostCount / 7) * 100)}%`,
                background: 'linear-gradient(90deg, #f47fff 0%, #5865f2 100%)',
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Feedback Message */}
        {boostFeedback && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              backgroundColor: 'rgba(35, 165, 90, 0.2)',
              border: '1px solid #23a55a',
              borderRadius: 6,
              color: '#2dc770',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Check size={16} />
            {boostFeedback}
          </div>
        )}

        {/* Actions & Points Balance */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#b5bac1' }}>Your Wallet Balance:</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 15,
                fontWeight: 700,
                color: '#5865f2',
              }}
            >
              💠 {userPoints} Points
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {userBoostedCount > 0 && (
              <button
                type="button"
                onClick={handleRetractBoost}
                style={{
                  backgroundColor: 'transparent',
                  color: '#fa777c',
                  border: '1px solid rgba(218, 55, 60, 0.4)',
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retract Boost
              </button>
            )}

            <button
              type="button"
              onClick={handleBoostServer}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #f47fff 0%, #ff73fa 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(244, 127, 255, 0.35)',
              }}
            >
              <Sparkles size={16} /> Boost Server (500 💠)
            </button>
          </div>
        </div>
      </div>

      {/* Boost Perks Table */}
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#f2f3f5', marginBottom: 12 }}>
          Unlocked Level Perks
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div
            style={{
              backgroundColor: '#2b2d31',
              borderRadius: 8,
              padding: 16,
              border: serverState.boostLevel >= 1 ? '2px solid #f47fff' : '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5', marginBottom: 4 }}>Level 1 (2 Boosts)</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#dbdee1', lineHeight: 1.5 }}>
              <li>+50 Extra Emoji Slots</li>
              <li>128 Kbps Audio Quality</li>
              <li>Custom Server Invite Background</li>
            </ul>
          </div>

          <div
            style={{
              backgroundColor: '#2b2d31',
              borderRadius: 8,
              padding: 16,
              border: serverState.boostLevel >= 2 ? '2px solid #f47fff' : '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5', marginBottom: 4 }}>Level 2 (4 Boosts)</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#dbdee1', lineHeight: 1.5 }}>
              <li>+100 Extra Emoji Slots</li>
              <li>256 Kbps Audio Quality</li>
              <li>50MB Upload Limit for all members</li>
              <li>1080p 60FPS Streams</li>
            </ul>
          </div>

          <div
            style={{
              backgroundColor: '#2b2d31',
              borderRadius: 8,
              padding: 16,
              border: serverState.boostLevel >= 3 ? '2px solid #f47fff' : '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5', marginBottom: 4 }}>Level 3 (7 Boosts)</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#dbdee1', lineHeight: 1.5 }}>
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
