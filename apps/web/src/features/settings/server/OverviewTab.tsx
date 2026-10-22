
import {
  Edit3,
  Loader2,
} from 'lucide-react';
import type { ServerSettingsState } from './useServerSettingsState';

/** Pestaña "overview" de ServerSettings. */
export function OverviewTab({ s }: { s: ServerSettingsState }) {
  const {
    serverState,
    isSaving,
    serverName,
    setServerName,
    serverDescription,
    setServerDescription,
    serverIcon,
    members,
    categories,
    handleIconUpload,
    handleSaveOverview,
  } = s;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Stats Header Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          padding: '20px',
          backgroundColor: '#2b2d31',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#949ba4', fontWeight: 600, textTransform: 'uppercase' }}>
            Members
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f2f3f5', marginTop: 4 }}>
            {members.length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#949ba4', fontWeight: 600, textTransform: 'uppercase' }}>
            Boost Level
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f47fff', marginTop: 4 }}>
            Level {serverState.boostLevel}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#949ba4', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Boosts
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f2f3f5', marginTop: 4 }}>
            {serverState.boostCount} boosts
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#949ba4', fontWeight: 600, textTransform: 'uppercase' }}>
            Channels
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f2f3f5', marginTop: 4 }}>
            {categories.reduce((acc, c) => acc + c.channels.length, 0)}
          </div>
        </div>
      </div>

      {/* Server Icon & Basic Info */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Icon Upload Box */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#b5bac1',
              marginBottom: 8,
            }}
          >
            Server Icon
          </label>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <img
              src={serverIcon || ''}
              alt={serverName}
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid rgba(255, 255, 255, 0.15)',
              }}
            />
            <label
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                cursor: 'pointer',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                transition: 'opacity 0.2s',
                opacity: 0.9,
              }}
            >
              <Edit3 size={18} />
              Change
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleIconUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Server Name Input */}
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#b5bac1',
              marginBottom: 8,
            }}
          >
            Server Name <span style={{ color: '#da373c' }}>*</span>
          </label>
          <input
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="e.g. Discordia Developers Hub"
            style={{
              width: '100%',
              backgroundColor: '#1e1f22',
              color: '#dbdee1',
              border: '1px solid rgba(0, 0, 0, 0.3)',
              borderRadius: 4,
              padding: '10px 12px',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Server Description */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#b5bac1',
            marginBottom: 8,
          }}
        >
          Server Description
        </label>
        <textarea
          rows={4}
          value={serverDescription}
          onChange={(e) => setServerDescription(e.target.value)}
          placeholder="Tell visitors and new members what this server is about..."
          style={{
            width: '100%',
            backgroundColor: '#1e1f22',
            color: '#dbdee1',
            border: '1px solid rgba(0, 0, 0, 0.3)',
            borderRadius: 4,
            padding: '10px 12px',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Save Button */}
      <div>
        <button
          type="button"
          onClick={handleSaveOverview}
          disabled={isSaving || !serverName.trim()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#5865f2',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 600,
            cursor: isSaving || !serverName.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Saving Overview...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}
