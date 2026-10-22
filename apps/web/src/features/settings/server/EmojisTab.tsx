
import {
  Plus,
  Trash2,
} from 'lucide-react';
import type { ServerSettingsState } from './useServerSettingsState';

/** Pestaña "emojis" de ServerSettings. */
export function EmojisTab({ s }: { s: ServerSettingsState }) {
  const { customEmojis, setCustomEmojis, handleEmojiUpload } = s;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: '0 0 4px 0' }}>
            Custom Server Emojis
          </h3>
          <span style={{ fontSize: 12, color: '#949ba4' }}>
            {customEmojis.length} / 50 standard emoji slots filled.
          </span>
        </div>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#5865f2',
            color: '#ffffff',
            padding: '8px 14px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Upload Emoji
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif"
            onChange={handleEmojiUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Emojis Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 16,
        }}
      >
        {customEmojis.map((emoji) => (
          <div
            key={emoji.id}
            style={{
              backgroundColor: '#2b2d31',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <img
              src={emoji.url}
              alt={emoji.name}
              style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 8 }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#dbdee1' }}>:{emoji.name}:</span>

            <button
              type="button"
              onClick={() => setCustomEmojis(customEmojis.filter((e) => e.id !== emoji.id))}
              title="Delete emoji"
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'none',
                border: 'none',
                color: '#949ba4',
                cursor: 'pointer',
                padding: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fa777c')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#949ba4')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
