
import {
  Calendar,
  Circle,
} from 'lucide-react';
import { Avatar } from '../../../ui/Avatar';
import type { OwnProfileState } from './useOwnProfileState';
import styles from './ProfilePreviewCard.module.css';

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
    <section className={styles.root}>
      <div className={styles.rootDiv}>
        <span>Live Preview</span>
        <span className={styles.cardPreview}>
          Card Preview
        </span>
      </div>

      {/* Profile Card Container */}
      <div className={styles.profileCardContainer}>
        {/* Banner */}
        <div
          className={styles.banner} style={{ backgroundColor: bannerColor }}
        />

        {/* Avatar & Presence Ring */}
        <div className={styles.avatarPresenceRing}>
          <div className={styles.avatarPresenceRingDiv}>
            <Avatar user={{ ...baseUser, avatar: avatarUrl } as any} size={80} />
            {/* Status Indicator Dot */}
            <span
              title={status}
              className={styles.statusIndicatorDot} style={{ backgroundColor: currentStatusColor }}
            />
          </div>

          {/* Points Badge */}
          <div
            className={styles.pointsBadge}
            title="Discordia Points"
          >
            <span>💠</span>
            <span>{baseUser.points ?? 0}</span>
          </div>
        </div>

        {/* Profile Info Body */}
        <div className={styles.profileInfoBody}>
          <div className={styles.profileInfoBodyDiv}>
            {/* Display Name & Tag */}
            <h2 className={styles.displayNameTag}>
              {displayName || 'Anonymous User'}
            </h2>
            <div className={styles.profileInfoBodyDivDiv}>
              @{baseUser.username}
              {baseUser.discriminator ? `#${baseUser.discriminator}` : ''}
            </div>

            {/* Custom Status */}
            {customStatus && (
              <div className={styles.profileInfoBodyDivDiv2}>
                &ldquo;{customStatus}&rdquo;
              </div>
            )}

            <div className={styles.profileInfoBodyDivDiv3} />

            {/* About Me (Bio) */}
            <div className={styles.aboutMeBio}>
              <div className={styles.aboutMe}>
                About Me
              </div>
              <p className={styles.aboutMeBioP}>
                {bio || 'This user has not written a bio yet.'}
              </p>
            </div>

            {/* Member Since / Created Date */}
            <div className={styles.aboutMeBio}>
              <div className={styles.aboutMe}>
                Discordia Member Since
              </div>
              <div className={styles.aboutMeBioDiv}>
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
                <div className={styles.roles}>
                  Roles
                </div>
                <div className={styles.profileInfoBodyDivDiv4}>
                  {userRoles.map((role) => (
                    <span
                      key={role?.id}
                      className={styles.profileInfoBodyDivDiv4Span} style={{ borderRadius: 4, border: `1px solid ${role?.color || 'var(--brand)'}` }}
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
