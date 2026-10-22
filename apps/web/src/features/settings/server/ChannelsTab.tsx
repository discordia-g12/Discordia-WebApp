
import {
  Hash,
  Volume2,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ServerSettingsState } from './useServerSettingsState';
import styles from './ChannelsTab.module.css';

/** Pestaña "channels" de ServerSettings. */
export function ChannelsTab({ s }: { s: ServerSettingsState }) {
  const {
    categories,
    showCreateChannelModal,
    setShowCreateChannelModal,
    newChannelName,
    setNewChannelName,
    newChannelType,
    setNewChannelType,
    newChannelCategory,
    setNewChannelCategory,
    handleCreateChannel,
    handleDeleteChannel,
  } = s;
  return (
    <div className={styles.root}>
      <div className={styles.rootDiv}>
        <div className={styles.serverChannelsCategories}>
          Server Channels & Categories
        </div>
        <button
          type="button"
          onClick={() => setShowCreateChannelModal(true)}
          className={styles.rootDivButton}
        >
          <Plus size={16} /> Create Channel
        </button>
      </div>

      {/* Categorized Channels */}
      <div className={styles.categorizedChannels}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={styles.categorizedChannelsDiv}
          >
            <div className={styles.categorizedChannelsDivDiv}>
              {cat.name} ({cat.channels.length})
            </div>

            <div className={styles.categorizedChannelsDivDiv2}>
              {cat.channels.map((chan) => (
                <div
                  key={chan.id}
                  className={styles.categorizedChannelsDivDiv2Div}
                >
                  <div className={styles.categorizedChannelsDivDiv2DivDiv}>
                    {chan.type === 'voice' ? (
                      <Volume2 size={16} color="#949ba4" />
                    ) : (
                      <Hash size={16} color="#949ba4" />
                    )}
                    <span className={styles.categorizedChannelsDivDiv2DivDivSpan}>{chan.name}</span>
                    {chan.topic && (
                      <span className={styles.categorizedChannelsDivDiv2DivDivSpan2}>— {chan.topic}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteChannel(cat.id, chan.id)}
                    title="Delete channel"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-danger)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <div className={styles.rootDiv2}>
          <div className={styles.rootDiv2Div}>
            <h3 className={styles.createChannel}>
              Create Channel
            </h3>

            <form onSubmit={handleCreateChannel} className={styles.categorizedChannels}>
              {/* Channel Type */}
              <div>
                <label className={styles.channelType}>
                  Channel Type
                </label>
                <div className={styles.channelTypeDiv}>
                  <button
                    type="button"
                    onClick={() => setNewChannelType('text')}
                    className={styles.channelTypeDivButton} style={{ backgroundColor: newChannelType === 'text' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', border: newChannelType === 'text' ? '2px solid var(--brand)' : '1px solid rgba(0,0,0,0.3)', borderRadius: 6 }}
                  >
                    <Hash size={18} />
                    <div className={styles.channelTypeDivButtonDiv}>
                      <div className={styles.text}>Text</div>
                      <div className={styles.postMessagesImages}>Post messages, images</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChannelType('voice')}
                    className={styles.channelTypeDivButton} style={{ backgroundColor: newChannelType === 'voice' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', border: newChannelType === 'voice' ? '2px solid var(--brand)' : '1px solid rgba(0,0,0,0.3)', borderRadius: 6 }}
                  >
                    <Volume2 size={18} />
                    <div className={styles.channelTypeDivButtonDiv}>
                      <div className={styles.text}>Voice</div>
                      <div className={styles.postMessagesImages}>Talk, share video</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Channel Name */}
              <div>
                <label className={styles.channelName}>
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="new-channel"
                  className={styles.newChannel}
                />
              </div>

              {/* Category Selector */}
              <div>
                <label className={styles.channelName}>
                  Category
                </label>
                <select
                  value={newChannelCategory}
                  onChange={(e) => setNewChannelCategory(e.target.value)}
                  className={styles.categorySelectorSelect}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Action Buttons */}
              <div className={styles.modalActionButtons}>
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className={styles.cancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.createChannel2}
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
