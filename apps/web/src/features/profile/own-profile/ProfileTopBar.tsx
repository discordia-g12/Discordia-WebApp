
import {
  ArrowLeft,
  Check,
  Loader2,
  Edit3,
} from 'lucide-react';
import type { OwnProfileState } from './useOwnProfileState';
import styles from './ProfileTopBar.module.css';

/** Sección "Top Navigation Bar" de OwnProfileView. */
export function ProfileTopBar({ s }: { s: OwnProfileState }) {
  const {
    onBack,
    mode,
    setMode,
    savedIndicator,
    isDisplayNameValid,
    handleDiscard,
    handleSave,
  } = s;
  return (
    <header className={styles.root}>
      <div className={styles.rootDiv}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--header-secondary)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              padding: '6px 10px',
              borderRadius: 4,
              transition: 'background-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = 'var(--text-white)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--header-secondary)';
            }}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        )}

        <div className={styles.rootDivDiv}>
          <h1 className={styles.userProfile}>
            User Profile
          </h1>
          {savedIndicator && (
            <span className={styles.rootDivDivSpan}>
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className={styles.actionControls}>
        {mode === 'view' ? (
          <button
            onClick={() => setMode('edit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'var(--brand)',
              color: 'var(--text-white)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand)')}
          >
            <Edit3 size={16} />
            <span>Edit Profile</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={mode === 'saving'}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-normal)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '7px 14px',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 500,
                cursor: mode === 'saving' ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (mode !== 'saving') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                if (mode !== 'saving') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Discard
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={mode === 'saving' || !isDisplayNameValid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: isDisplayNameValid ? 'var(--status-online)' : 'var(--interactive-muted)',
                color: 'var(--text-white)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                cursor: mode === 'saving' || !isDisplayNameValid ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (mode !== 'saving' && isDisplayNameValid) {
                  e.currentTarget.style.backgroundColor = 'var(--legacy-green-dark)';
                }
              }}
              onMouseLeave={(e) => {
                if (mode !== 'saving' && isDisplayNameValid) {
                  e.currentTarget.style.backgroundColor = 'var(--status-online)';
                }
              }}
            >
              {mode === 'saving' ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
