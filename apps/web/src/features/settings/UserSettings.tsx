import React from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Palette,
  Mic,
  Bell,
  Check,
  LogOut,
} from 'lucide-react';
import { User } from '../../types';
import { SettingsTab } from './user/shared';
import { useUserSettingsState } from './user/useUserSettingsState';
import { ProfileTab } from './user/ProfileTab';
import { SecurityTab } from './user/SecurityTab';
import { PremiumTab } from './user/PremiumTab';
import { BillingTab } from './user/BillingTab';
import { AppearanceTab } from './user/AppearanceTab';
import { VoiceTab } from './user/VoiceTab';
import { NotificationsTab } from './user/NotificationsTab';
import styles from './UserSettings.module.css';

export interface UserSettingsProps {
  currentUser?: User;
  onClose?: () => void;
  onUpdateUser?: (updatedUser: User) => void;
  onLogout?: () => void;
}

export const UserSettings: React.FC<UserSettingsProps> = (props) => {
  const s = useUserSettingsState(props);
  const {
    onClose,
    onLogout,
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    saveSuccess,
  } = s;

  return (
    <div className={styles.root}>
      {/* Sidebar */}
      <nav
        className={styles.sidebar} style={{ width: sidebarCollapsed ? 64 : 240 }}
      >
        {/* Sidebar Top Toggle */}
        <div
          className={styles.sidebarTopToggle} style={{ padding: sidebarCollapsed ? '16px 8px' : '16px 20px', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}
        >
          {!sidebarCollapsed && (
            <div>
              <div className={styles.userSettings}>User Settings</div>
              <div className={styles.preferences}>Preferences</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--header-secondary)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Categories and Nav links */}
        <div className={styles.categoriesNavLinks}>
          {/* Group 1: User Settings */}
          {!sidebarCollapsed && (
            <div className={styles.userSettings2}>
              User Settings
            </div>
          )}

          {[
            { id: 'profile', label: 'My Account & Profile', icon: UserIcon },
            { id: 'security', label: 'Security & 2FA', icon: ShieldCheck },
            { id: 'premium', label: 'Discordia Premium', icon: Sparkles },
            { id: 'billing', label: 'Billing & Points', icon: CreditCard },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as SettingsTab)}
                title={sidebarCollapsed ? item.label : undefined}
                className={styles.categoriesNavLinksButton} style={{ padding: sidebarCollapsed ? '10px 0' : '8px 12px', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent', color: isActive ? 'var(--text-white)' : 'var(--header-secondary)', fontWeight: isActive ? 600 : 500 }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          <div className={styles.categoriesNavLinksDiv} />

          {/* Group 2: App Settings */}
          {!sidebarCollapsed && (
            <div className={styles.userSettings2}>
              App Settings
            </div>
          )}

          {[
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'voice', label: 'Voice & Audio', icon: Mic },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as SettingsTab)}
                title={sidebarCollapsed ? item.label : undefined}
                className={styles.categoriesNavLinksButton} style={{ padding: sidebarCollapsed ? '10px 0' : '8px 12px', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent', color: isActive ? 'var(--text-white)' : 'var(--header-secondary)', fontWeight: isActive ? 600 : 500 }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          <div className={styles.categoriesNavLinksDiv2} />

          {/* Logout Button */}
          <div className={styles.categoriesNavLinksDiv} />
          <button
            type="button"
            onClick={() => {
              const confirmLogout = window.confirm('Are you sure you want to log out of Discordia?');
              if (confirmLogout) onLogout?.();
            }}
            title={sidebarCollapsed ? 'Log Out' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: sidebarCollapsed ? '10px 0' : '8px 12px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              backgroundColor: 'transparent',
              color: 'var(--text-danger)',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(218, 55, 60, 0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={styles.mainContentArea}>
        {/* Top Header with ESC Button */}
        <div className={styles.topHeaderWithEsc}>
          <div className={styles.topHeaderWithEscDiv}>
            <h2 className={styles.topHeaderWithEscDivH2}>
              {activeTab}
            </h2>
            {saveSuccess && (
              <span className={styles.topHeaderWithEscDivSpan}>
                <Check size={14} /> Changes Saved
              </span>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close settings (ESC)"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                color: 'var(--header-secondary)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div className={styles.closeSettingsEscDiv}>
                <X size={16} />
              </div>
              <span className={styles.esc}>ESC</span>
            </button>
          )}
        </div>

        {/* View Details */}
        <div className={styles.viewDetails}>
          <div className={styles.viewDetailsDiv}>
            {/* 1. PROFILE TAB */}
            {activeTab === 'profile' && <ProfileTab s={s} />}

            {/* 2. SECURITY TAB */}
            {activeTab === 'security' && <SecurityTab s={s} />}

            {/* 3. PREMIUM TAB */}
            {activeTab === 'premium' && <PremiumTab s={s} />}

            {/* 4. BILLING TAB */}
            {activeTab === 'billing' && <BillingTab s={s} />}

            {/* 5. APPEARANCE TAB */}
            {activeTab === 'appearance' && <AppearanceTab s={s} />}

            {/* 6. VOICE TAB */}
            {activeTab === 'voice' && <VoiceTab s={s} />}

            {/* 7. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && <NotificationsTab s={s} />}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UserSettings;
