
import {
  ShieldCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { BACKUP_CODES } from './shared';
import type { UserSettingsState } from './useUserSettingsState';
import styles from './SecurityTab.module.css';

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
    <div className={styles.root}>
      {/* 2FA Card */}
      <div className={styles.rootDiv}>
        <div className={styles.rootDivDiv}>
          <div className={styles.rootDivDivDiv}>
            <div className={styles.rootDivDivDivDiv}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className={styles.rootDivDivDivDiv2}>
                Two-Factor Authentication (2FA)
              </div>
              <div className={styles.enabledProtectingAccount}>
                Enabled & Protecting Account
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowBackupCodes(!showBackupCodes)}
            className={styles.rootDivDivButton}
          >
            {showBackupCodes ? 'Hide Backup Codes' : 'View Backup Codes'}
          </button>
        </div>

        {/* Backup Codes Accordion */}
        {showBackupCodes && (
          <div className={styles.rootDivDiv2}>
            <div className={styles.rootDivDiv2Div}>
              Keep these one-time backup codes in a safe place in case you lose access to your authenticator app.
            </div>

            <div className={styles.rootDivDiv2Div2}>
              {BACKUP_CODES.map((code, i) => (
                <div key={i} className={styles.rootDivDiv2Div2Div}>
                  {code}
                </div>
              ))}
            </div>

            <div className={styles.rootDivDiv2Div3}>
              <button
                type="button"
                onClick={copyBackupCodesToClipboard}
                className={styles.rootDivDiv2Div3Button}
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
        className={styles.changePasswordForm}
      >
        <div className={styles.rootDivDiv}>
          <h3 className={styles.changePassword}>
            Change Password
          </h3>
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className={styles.rootDivDivButton2}
          >
            {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPasswords ? 'Hide' : 'Show'}
          </button>
        </div>

        {passwordMsg && (
          <div
            className={styles.changePasswordFormDiv} style={{ borderRadius: 4, backgroundColor: passwordMsg.type === 'success' ? 'rgba(35, 165, 90, 0.15)' : 'rgba(218, 55, 60, 0.15)', color: passwordMsg.type === 'success' ? 'var(--text-positive)' : 'var(--text-danger)', border: `1px solid ${passwordMsg.type === 'success' ? 'var(--status-online)' : 'var(--danger)'}` }}
          >
            {passwordMsg.text}
          </div>
        )}

        <div>
          <label className={styles.currentPassword}>
            Current Password
          </label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={styles.changePasswordFormInput}
          />
        </div>

        <div>
          <label className={styles.currentPassword}>
            New Password (min 8 chars)
          </label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={styles.changePasswordFormInput}
          />
        </div>

        <div>
          <label className={styles.currentPassword}>
            Confirm New Password
          </label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={styles.changePasswordFormInput}
          />
        </div>

        <div>
          <button
            type="submit"
            className={styles.updatePassword}
          >
            Update Password
          </button>
        </div>
      </form>
    </div>
  );
}
