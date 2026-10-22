import React from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Hash,
  Shield,
  Users,
  Bell,
  Sparkles,
  Flame,
  Check,
  Sliders,
  FileText,
  Smile,
  UserX,
} from 'lucide-react';
import { Server, User } from '../../types';
import { ServerMembersTab } from '../moderation/ServerMembersTab';
import { ServerBansTab } from '../moderation/ServerBansTab';
import { TabType } from './server/shared';
import { useServerSettingsState } from './server/useServerSettingsState';
import { OverviewTab } from './server/OverviewTab';
import { RolesTab } from './server/RolesTab';
import { ChannelsTab } from './server/ChannelsTab';
import { ModerationTab } from './server/ModerationTab';
import { AuditLogTab } from './server/AuditLogTab';
import { NotificationsTab } from './server/NotificationsTab';
import { EmojisTab } from './server/EmojisTab';
import { BoostTab } from './server/BoostTab';

export interface ServerSettingsProps {
  server?: Server;
  currentUser?: User;
  onClose?: () => void;
  onUpdateServer?: (updatedServer: Server) => void;
}

export const ServerSettings: React.FC<ServerSettingsProps> = (props) => {
  const s = useServerSettingsState(props);
  const {
    onClose,
    user,
    serverState,
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
      {/* Sidebar Navigation */}
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
        {/* Sidebar Header */}
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
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#f2f3f5',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {serverState.name}
              </div>
              <div style={{ fontSize: 11, color: '#949ba4', textTransform: 'uppercase' }}>Server Settings</div>
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {[
            { id: 'overview', label: 'Overview', icon: Sliders },
            { id: 'roles', label: 'Roles', icon: Shield },
            { id: 'emojis', label: 'Emoji', icon: Smile },
            { id: 'boost', label: 'Server Boost', icon: Sparkles },
            { type: 'divider' },
            { id: 'channels', label: 'Channels', icon: Hash },
            { id: 'moderation', label: 'Moderation', icon: Flame },
            { id: 'audit-log', label: 'Audit Log', icon: FileText },
            { type: 'divider' },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'bans', label: 'Bans', icon: UserX },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ].map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={`div-${index}`}
                  style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '8px 6px' }}
                />
              );
            }

            const IconComponent = item.icon as React.ElementType;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as TabType)}
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
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#dbdee1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#b5bac1';
                  }
                }}
              >
                <IconComponent size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
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
        {/* Top Control Bar with Close ESC button */}
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
              {activeTab.replace('-', ' ')}
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
                <Check size={14} /> Saved
              </span>
            )}
          </div>

          {onClose && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
            </div>
          )}
        </div>

        {/* Scrollable View Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
          <div style={{ maxWidth: 840 }}>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && <OverviewTab s={s} />}

            {/* 2. ROLES TAB */}
            {activeTab === 'roles' && <RolesTab s={s} />}

            {/* 3. MEMBERS TAB */}
            {activeTab === 'members' && (
              <ServerMembersTab serverId={serverState.id} ownerId={serverState.ownerId} currentUserId={user.id} />
            )}

            {/* BANS TAB */}
            {activeTab === 'bans' && <ServerBansTab serverId={serverState.id} />}

            {/* 4. CHANNELS TAB */}
            {activeTab === 'channels' && <ChannelsTab s={s} />}

            {/* 5. MODERATION TAB */}
            {activeTab === 'moderation' && <ModerationTab s={s} />}

            {/* 6. AUDIT LOG TAB */}
            {activeTab === 'audit-log' && <AuditLogTab />}

            {/* 7. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && <NotificationsTab s={s} />}

            {/* 8. EMOJIS TAB */}
            {activeTab === 'emojis' && <EmojisTab s={s} />}

            {/* 9. BOOST TAB */}
            {activeTab === 'boost' && <BoostTab s={s} />}
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

export default ServerSettings;
