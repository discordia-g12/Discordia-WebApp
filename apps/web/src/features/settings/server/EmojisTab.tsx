
import {
  Plus,
  Trash2,
} from 'lucide-react';
import type { ServerSettingsState } from './useServerSettingsState';
import styles from './EmojisTab.module.css';

/** Pestaña "emojis" de ServerSettings. */
export function EmojisTab({ s }: { s: ServerSettingsState }) {
  const { customEmojis, setCustomEmojis, handleEmojiUpload } = s;
  return (
    <div className={styles.root}>
      <div className={styles.rootDiv}>
        <div>
          <h3 className={styles.customServerEmojis}>
            Custom Server Emojis
          </h3>
          <span className={styles.rootDivSpan}>
            {customEmojis.length} / 50 standard emoji slots filled.
          </span>
        </div>

        <label className={styles.rootDivLabel}>
          <Plus size={16} /> Upload Emoji
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif"
            onChange={handleEmojiUpload}
            className={styles.rootDivLabelInput}
          />
        </label>
      </div>

      {/* Emojis Grid */}
      <div className={styles.emojisGrid}>
        {customEmojis.map((emoji) => (
          <div
            key={emoji.id}
            className={styles.emojisGridDiv}
          >
            <img
              src={emoji.url}
              alt={emoji.name}
              className={styles.emojisGridDivImg}
            />
            <span className={styles.emojisGridDivSpan}>:{emoji.name}:</span>

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
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-danger)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
