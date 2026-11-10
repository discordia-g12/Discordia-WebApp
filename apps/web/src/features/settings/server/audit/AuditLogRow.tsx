import { useState } from 'react';
import type { AuditLogEntry, User } from '@discordia/core';
import { formatAuditAction, formatAuditDate } from '@discordia/core';
import { ActionLink, SquareAvatar } from '../../../../ui';
import { AuditLogDiff } from './AuditLogDiff';
import styles from './AuditLogViewer.module.css';

interface AuditLogRowProps {
  entry: AuditLogEntry;
  actor?: User | null;
  targetUser?: User | null;
  onFilterByActor?: (actorName: string) => void;
}

export function AuditLogRow({ entry, actor, targetUser, onFilterByActor }: AuditLogRowProps) {
  const [showChanges, setShowChanges] = useState(false);

  const actorName = actor?.displayName || actor?.username || entry.actorId;
  const actionText = formatAuditAction(entry);
  const formattedDate = formatAuditDate(entry.createdAt);

  const hasChanges = Boolean(entry.changes && Object.keys(entry.changes).length > 0);

  let targetText: string | null = null;
  if (targetUser) {
    targetText = `@${targetUser.displayName || targetUser.username}`;
  } else if (entry.metadata?.name && typeof entry.metadata.name === 'string') {
    targetText = entry.metadata.name;
  } else if (entry.metadata?.code && typeof entry.metadata.code === 'string') {
    targetText = entry.metadata.code;
  } else if (entry.targetId && entry.targetId !== entry.serverId) {
    targetText = entry.targetId;
  }

  const avatar = (
    <SquareAvatar
      user={{
        displayName: actorName,
        username: actor?.username || entry.actorId,
        avatar: actor?.avatar || null,
      }}
      size={28}
    />
  );

  return (
    <li className={styles.row}>
      <div className={styles.rowHeader}>
        <div className={styles.actorInfo}>
          {onFilterByActor ? (
            <button
              type="button"
              className={styles.actorButton}
              onClick={() => onFilterByActor(actorName)}
              title={`Filtrar acciones de ${actorName}`}
            >
              {avatar}
              <span className={styles.actorName}>{actorName}</span>
            </button>
          ) : (
            <div className={styles.actorButton}>
              {avatar}
              <span className={styles.actorName}>{actorName}</span>
            </div>
          )}
          <span className={styles.actionTag}>{actionText}</span>
          {targetText && <span className={styles.targetName}>{targetText}</span>}
        </div>
        <time className={styles.time} dateTime={entry.createdAt}>
          {formattedDate}
        </time>
      </div>

      {entry.reason && <p className={styles.reason}>/ motivo: {entry.reason}</p>}

      {hasChanges && (
        <div className={styles.diffToggle}>
          <ActionLink
            onPress={() => setShowChanges((prev) => !prev)}
            aria-expanded={showChanges}
          >
            {showChanges ? 'ocultar cambios' : 'ver cambios'}
          </ActionLink>
          {showChanges && <AuditLogDiff changes={entry.changes} />}
        </div>
      )}
    </li>
  );
}
