
import {
  Calendar,
  Circle,
} from 'lucide-react';
import { Avatar } from '../../../ui/Avatar';
import type { OwnProfileState } from './useOwnProfileState';

/** Sección "Left Column: Live Profile Card Preview" de OwnProfileView. */
export function ProfilePreviewCard({ s }: { s: OwnProfileState }) {
  const {
    baseUser,
    displayName,
    bio,
    status,
    customStatus,
    bannerColor,
    avatarUrl,
    userRoles,
    currentStatusColor,
  } = s;
  return (
    <section
      style={{
        flex: '0 0 360px',
        backgroundColor: '#2b2d31',
        borderRight: '1px solid rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 24px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 320,
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: '#949ba4',
          letterSpacing: '0.04em',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Live Preview</span>
        <span
          style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            backgroundColor: 'rgba(88, 101, 242, 0.2)',
            color: '#5865f2',
          }}
        >
          Card Preview
        </span>
      </div>

      {/* Profile Card Container */}
      <div
        style={{
          width: '100%',
          maxWidth: 320,
          backgroundColor: '#111214',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
          position: 'relative',
        }}
      >
        {/* Banner */}
        <div
          style={{
            height: 105,
            backgroundColor: bannerColor,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)`,
            position: 'relative',
            transition: 'background-color 0.2s',
          }}
        />

        {/* Avatar & Presence Ring */}
        <div
          style={{
            padding: '0 16px',
            marginTop: -44,
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 80,
              height: 80,
            }}
          >
            <Avatar user={{ ...baseUser, avatar: avatarUrl } as any} size={80} />
            {/* Status Indicator Dot */}
            <span
              title={status}
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: currentStatusColor,
                border: '3px solid #111214',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Points Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              padding: '4px 8px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              color: '#5865f2',
              marginBottom: 8,
            }}
            title="Discordia Points"
          >
            <span>💠</span>
            <span>{baseUser.points ?? 0}</span>
          </div>
        </div>

        {/* Profile Info Body */}
        <div
          style={{
            padding: '12px 16px 20px 16px',
            backgroundColor: '#111214',
          }}
        >
          <div
            style={{
              backgroundColor: '#232428',
              borderRadius: 8,
              padding: '12px',
            }}
          >
            {/* Display Name & Tag */}
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#f2f3f5',
                margin: '0 0 2px 0',
                lineHeight: 1.2,
              }}
            >
              {displayName || 'Anonymous User'}
            </h2>
            <div style={{ fontSize: 13, color: '#949ba4', marginBottom: 10 }}>
              @{baseUser.username}
              {baseUser.discriminator ? `#${baseUser.discriminator}` : ''}
            </div>

            {/* Custom Status */}
            {customStatus && (
              <div
                style={{
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: '#dbdee1',
                  padding: '6px 10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 6,
                  marginBottom: 12,
                  borderLeft: '3px solid #5865f2',
                }}
              >
                &ldquo;{customStatus}&rdquo;
              </div>
            )}

            <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '12px 0' }} />

            {/* About Me (Bio) */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#b5bac1',
                  letterSpacing: '0.04em',
                  marginBottom: 4,
                }}
              >
                About Me
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: '#dbdee1',
                  lineHeight: 1.45,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {bio || 'This user has not written a bio yet.'}
              </p>
            </div>

            {/* Member Since / Created Date */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#b5bac1',
                  letterSpacing: '0.04em',
                  marginBottom: 4,
                }}
              >
                Discordia Member Since
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#949ba4' }}>
                <Calendar size={14} />
                <span>
                  {baseUser.joinedAt
                    ? new Date(baseUser.joinedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                    : 'Jan 10, 2022'}
                </span>
              </div>
            </div>

            {/* Roles */}
            {userRoles.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#b5bac1',
                    letterSpacing: '0.04em',
                    marginBottom: 6,
                  }}
                >
                  Roles
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {userRoles.map((role) => (
                    <span
                      key={role?.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        color: '#dbdee1',
                        border: `1px solid ${role?.color || '#5865f2'}`,
                      }}
                    >
                      <Circle size={8} fill={role?.color || '#5865f2'} strokeWidth={0} />
                      {role?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
