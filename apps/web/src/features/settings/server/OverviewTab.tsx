
import {
  Edit3,
  Loader2,
} from 'lucide-react';
import type { ServerSettingsState } from './useServerSettingsState';
import styles from './OverviewTab.module.css';

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
    <div className={styles.root}>
      {/* Stats Header Banner */}
      <div className={styles.statsHeaderBanner}>
        <div>
          <div className={styles.members}>
            Members
          </div>
          <div className={styles.statsHeaderBannerDiv}>
            {members.length}
          </div>
        </div>
        <div>
          <div className={styles.members}>
            Boost Level
          </div>
          <div className={styles.statsHeaderBannerDiv2}>
            Level {serverState.boostLevel}
          </div>
        </div>
        <div>
          <div className={styles.members}>
            Active Boosts
          </div>
          <div className={styles.statsHeaderBannerDiv}>
            {serverState.boostCount} boosts
          </div>
        </div>
        <div>
          <div className={styles.members}>
            Channels
          </div>
          <div className={styles.statsHeaderBannerDiv}>
            {categories.reduce((acc, c) => acc + c.channels.length, 0)}
          </div>
        </div>
      </div>

      {/* Server Icon & Basic Info */}
      <div className={styles.serverIconBasicInfo}>
        {/* Icon Upload Box */}
        <div>
          <label className={styles.serverIcon}>
            Server Icon
          </label>
          <div className={styles.iconUploadBoxDiv}>
            <img
              src={serverIcon || ''}
              alt={serverName}
              className={styles.iconUploadBoxDivImg}
            />
            <label className={styles.iconUploadBoxDivLabel}>
              <Edit3 size={18} />
              Change
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleIconUpload}
                className={styles.iconUploadBoxDivLabelInput}
              />
            </label>
          </div>
        </div>

        {/* Server Name Input */}
        <div className={styles.serverNameInput}>
          <label className={styles.serverIcon}>
            Server Name <span className={styles.serverIconSpan}>*</span>
          </label>
          <input
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="e.g. Discordia Developers Hub"
            className={styles.eGDiscordiaDevelopers}
          />
        </div>
      </div>

      {/* Server Description */}
      <div>
        <label className={styles.serverIcon}>
          Server Description
        </label>
        <textarea
          rows={4}
          value={serverDescription}
          onChange={(e) => setServerDescription(e.target.value)}
          placeholder="Tell visitors and new members what this server is about..."
          className={styles.tellVisitorsNewMembers}
        />
      </div>

      {/* Save Button */}
      <div>
        <button
          type="button"
          onClick={handleSaveOverview}
          disabled={isSaving || !serverName.trim()}
          className={styles.saveButtonButton} style={{ cursor: isSaving || !serverName.trim() ? 'not-allowed' : 'pointer' }}
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
