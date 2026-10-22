
import {
  ArrowLeft,
  Check,
  Loader2,
  Edit3,
} from 'lucide-react';
import type { OwnProfileState } from './useOwnProfileState';

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
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        padding: '0 24px',
        backgroundColor: '#2b2d31',
        borderBottom: '1px solid rgba(0, 0, 0, 0.25)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#b5bac1',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              padding: '6px 10px',
              borderRadius: 4,
              transition: 'background-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#b5bac1';
            }}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
            User Profile
          </h1>
          {savedIndicator && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(35, 165, 90, 0.2)',
                color: '#2dc770',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {mode === 'view' ? (
          <button
            onClick={() => setMode('edit')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#5865f2',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4752c4')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5865f2')}
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
                color: '#dbdee1',
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
                backgroundColor: isDisplayNameValid ? '#23a55a' : '#4e5058',
                color: '#ffffff',
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
                  e.currentTarget.style.backgroundColor = '#1a7e44';
                }
              }}
              onMouseLeave={(e) => {
                if (mode !== 'saving' && isDisplayNameValid) {
                  e.currentTarget.style.backgroundColor = '#23a55a';
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
