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
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundColor: '#313338',
        color: '#dbdee1',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sidebar */}
      <nav
        style={{
          width: sidebarCollapsed ? 64 : 240,
          backgroundColor: '#2b2d31',
          borderRight: '1px solid rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.2s ease',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Sidebar Top Toggle */}
        <div
          style={{
            padding: sidebarCollapsed ? '16px 8px' : '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
          }}
        >
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f2f3f5' }}>User Settings</div>
              <div style={{ fontSize: 11, color: '#949ba4', textTransform: 'uppercase' }}>Preferences</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'none',
              border: 'none',
              color: '#b5bac1',
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
        <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {/* Group 1: User Settings */}
          {!sidebarCollapsed && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#949ba4', padding: '6px 12px' }}>
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: sidebarCollapsed ? '10px 0' : '8px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#b5bac1',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '10px 6px' }} />

          {/* Group 2: App Settings */}
          {!sidebarCollapsed && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#949ba4', padding: '6px 12px' }}>
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: sidebarCollapsed ? '10px 0' : '8px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#b5bac1',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Logout Button */}
          <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '10px 6px' }} />
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
              color: '#fa777c',
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
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#313338',
        }}
      >
        {/* Top Header with ESC Button */}
        <div
          style={{
            height: 56,
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0, 0, 0, 0.25)',
            backgroundColor: '#2b2d31',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0, textTransform: 'capitalize' }}>
              {activeTab}
            </h2>
            {saveSuccess && (
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
                }}
              >
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
                color: '#b5bac1',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  border: '2px solid #b5bac1',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>ESC</span>
            </button>
          )}
        </div>

        {/* View Details */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
          <div style={{ maxWidth: 740 }}>
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
