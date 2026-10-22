
import {
  ShieldCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { BACKUP_CODES } from './shared';
import type { UserSettingsState } from './useUserSettingsState';

/** Pestaña "security" de UserSettings. */
export function SecurityTab({ s }: { s: UserSettingsState }) {
  const {
    showBackupCodes,
    setShowBackupCodes,
    copiedCode,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showPasswords,
    setShowPasswords,
    passwordMsg,
    handleUpdatePassword,
    copyBackupCodesToClipboard,
  } = s;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* 2FA Card */}
      <div
        style={{
          backgroundColor: '#2b2d31',
          borderRadius: 8,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 8,
                backgroundColor: 'rgba(35, 165, 90, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2dc770',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5' }}>
                Two-Factor Authentication (2FA)
              </div>
              <div style={{ fontSize: 13, color: '#2dc770', fontWeight: 600, marginTop: 2 }}>
                Enabled & Protecting Account
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowBackupCodes(!showBackupCodes)}
            style={{
              backgroundColor: 'transparent',
              color: '#dbdee1',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '8px 14px',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {showBackupCodes ? 'Hide Backup Codes' : 'View Backup Codes'}
          </button>
        </div>

        {/* Backup Codes Accordion */}
        {showBackupCodes && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ fontSize: 13, color: '#b5bac1', marginBottom: 12 }}>
              Keep these one-time backup codes in a safe place in case you lose access to your authenticator app.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                backgroundColor: '#1e1f22',
                padding: 12,
                borderRadius: 6,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                color: '#f2f3f5',
                textAlign: 'center',
              }}
            >
              {BACKUP_CODES.map((code, i) => (
                <div key={i} style={{ padding: '4px 0' }}>
                  {code}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={copyBackupCodesToClipboard}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#5865f2',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                {copiedCode ? 'Copied!' : 'Copy All Codes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Form */}
      <form
        onSubmit={handleUpdatePassword}
        style={{
          backgroundColor: '#2b2d31',
          borderRadius: 8,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
            Change Password
          </h3>
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            style={{
              background: 'none',
              border: 'none',
              color: '#949ba4',
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPasswords ? 'Hide' : 'Show'}
          </button>
        </div>

        {passwordMsg && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              fontSize: 13,
              backgroundColor: passwordMsg.type === 'success' ? 'rgba(35, 165, 90, 0.15)' : 'rgba(218, 55, 60, 0.15)',
              color: passwordMsg.type === 'success' ? '#2dc770' : '#fa777c',
              border: `1px solid ${passwordMsg.type === 'success' ? '#23a55a' : '#da373c'}`,
            }}
          >
            {passwordMsg.text}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
            Current Password
          </label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
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

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
            New Password (min 8 chars)
          </label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
            Confirm New Password
          </label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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

        <div>
          <button
            type="submit"
            style={{
              backgroundColor: '#5865f2',
              color: '#ffffff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Update Password
          </button>
        </div>
      </form>
    </div>
  );
}
