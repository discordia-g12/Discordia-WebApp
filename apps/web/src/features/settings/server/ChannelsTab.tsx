
import {
  Hash,
  Volume2,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ServerSettingsState } from './useServerSettingsState';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5' }}>
          Server Channels & Categories
        </div>
        <button
          type="button"
          onClick={() => setShowCreateChannelModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#5865f2',
            color: '#ffffff',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Create Channel
        </button>
      </div>

      {/* Categorized Channels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            style={{
              backgroundColor: '#2b2d31',
              borderRadius: 8,
              padding: '16px',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#949ba4',
                letterSpacing: '0.04em',
                marginBottom: 12,
              }}
            >
              {cat.name} ({cat.channels.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cat.channels.map((chan) => (
                <div
                  key={chan.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#1e1f22',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {chan.type === 'voice' ? (
                      <Volume2 size={16} color="#949ba4" />
                    ) : (
                      <Hash size={16} color="#949ba4" />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#dbdee1' }}>{chan.name}</span>
                    {chan.topic && (
                      <span style={{ fontSize: 12, color: '#949ba4' }}>— {chan.topic}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteChannel(cat.id, chan.id)}
                    title="Delete channel"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#949ba4',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fa777c')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#949ba4')}
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#313338',
              width: '100%',
              maxWidth: 440,
              borderRadius: 8,
              padding: 24,
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f2f3f5', margin: '0 0 16px 0' }}>
              Create Channel
            </h3>

            <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Channel Type */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 8 }}>
                  Channel Type
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setNewChannelType('text')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px',
                      backgroundColor: newChannelType === 'text' ? '#2b2d31' : '#1e1f22',
                      border: newChannelType === 'text' ? '2px solid #5865f2' : '1px solid rgba(0,0,0,0.3)',
                      borderRadius: 6,
                      color: '#dbdee1',
                      cursor: 'pointer',
                    }}
                  >
                    <Hash size={18} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Text</div>
                      <div style={{ fontSize: 11, color: '#949ba4' }}>Post messages, images</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChannelType('voice')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px',
                      backgroundColor: newChannelType === 'voice' ? '#2b2d31' : '#1e1f22',
                      border: newChannelType === 'voice' ? '2px solid #5865f2' : '1px solid rgba(0,0,0,0.3)',
                      borderRadius: 6,
                      color: '#dbdee1',
                      cursor: 'pointer',
                    }}
                  >
                    <Volume2 size={18} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Voice</div>
                      <div style={{ fontSize: 11, color: '#949ba4' }}>Talk, share video</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Channel Name */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="new-channel"
                  style={{
                    width: '100%',
                    backgroundColor: '#1e1f22',
                    color: '#dbdee1',
                    border: '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: 4,
                    padding: '8px 10px',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Category Selector */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                  Category
                </label>
                <select
                  value={newChannelCategory}
                  onChange={(e) => setNewChannelCategory(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1e1f22',
                    color: '#dbdee1',
                    border: '1px solid rgba(0, 0, 0, 0.3)',
                    borderRadius: 4,
                    padding: '8px 10px',
                    fontSize: 14,
                    outline: 'none',
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#dbdee1',
                    border: 'none',
                    padding: '8px 16px',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#5865f2',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
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
