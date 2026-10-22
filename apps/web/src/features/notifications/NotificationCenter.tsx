import React, { useState, useEffect,  } from 'react';
import {
  X, Check, Bell, Smile, MessageSquare, CornerDownLeft, AtSign, 
} from 'lucide-react';
import { Notification} from '../../types';
import { ModalOverlay } from '../../ui/ModalOverlay';
import styles from './NotificationCenter.module.css';

export interface NotificationCenterProps {
  notifications?: Notification[];
  isOpen?: boolean;
  onClose: () => void;
  onMarkAllRead?: () => void;
  onMarkRead?: (id: string) => void;
  onNotificationClick?: (notification: Notification) => void;
}

type NotificationFilter = 'all' | 'mention' | 'dm' | 'reply' | 'unread';

/**
 * Panel flotante con filtros por tipo, badges semánticas y marcado de lectura individual.
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications = [],
  isOpen = true,
  onClose,
  onMarkAllRead,
  onMarkRead,
  onNotificationClick,
}) => {
  const [items, setItems] = useState<Notification[]>(notifications);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  if (!isOpen) return null;

  const handleMarkAll = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    onMarkAllRead?.();
  };

  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
    onMarkRead?.(id);
  };

  const filteredItems = items.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'mention') return n.type === 'mention';
    if (filter === 'dm') return n.type === 'dm';
    if (filter === 'reply') return n.type === 'reply';
    return true;
  });

  const unreadCount = items.filter((n) => !n.read).length;

  const getTypeBadge = (type: Notification['type']) => {
    switch (type) {
      case 'mention':
        return (
          <span className={styles.getTypeBadgeSpan}>
            <AtSign size={13} />
          </span>
        );
      case 'dm':
        return (
          <span className={styles.getTypeBadgeSpan2}>
            <MessageSquare size={13} />
          </span>
        );
      case 'reply':
        return (
          <span className={styles.getTypeBadgeSpan3}>
            <CornerDownLeft size={13} />
          </span>
        );
      case 'reaction':
        return (
          <span className={styles.getTypeBadgeSpan4}>
            <Smile size={13} />
          </span>
        );
      default:
        return (
          <span className={styles.getTypeBadgeSpan5}>
            <Bell size={13} />
          </span>
        );
    }
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={500}>
      <div className={styles.div}>
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: 14,
          }}
        >
          <div className={styles.headerDiv}>
            <Bell size={20} style={{ color: 'var(--brand)' }} />
            <h2 className="modal-title" style={{ fontSize: 18, margin: 0 }}>
              Bandeja de Entrada
            </h2>
            {unreadCount > 0 && (
              <span className="badge badge-brand" style={{ fontSize: 11 }}>
                {unreadCount} no leídas
              </span>
            )}
          </div>
          <div className={styles.headerDiv2}>
            <button
              type="button"
              onClick={handleMarkAll}
              className="btn btn-link"
              style={{ fontSize: 12, color: 'var(--text-link)', display: 'flex', alignItems: 'center', gap: 4 }}
              title="Marcar todas como leídas"
            >
              <Check size={14} /> Marcar todas leídas
            </button>
            <button onClick={onClose} className="btn-icon" aria-label="Cerrar notificaciones">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.filtros}>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'unread', label: 'No leídas' },
            { id: 'mention', label: 'Menciones' },
            { id: 'dm', label: 'Mensajes DMs' },
            { id: 'reply', label: 'Respuestas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as NotificationFilter)}
              className={styles.filtrosButton} style={{ backgroundColor: filter === tab.id ? 'var(--brand)' : 'transparent', color: filter === tab.id ? 'white' : 'var(--interactive-normal)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lista de Notificaciones */}
        <div
          className="modal-body"
          style={{
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '12px 16px',
          }}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onNotificationClick?.(item)}
                className={styles.listaNotificacionesDiv} style={{ backgroundColor: item.read ? 'var(--bg-secondary)' : 'var(--bg-modifier-selected)', borderLeft: item.read ? '3px solid transparent' : '3px solid var(--brand)' }}
              >
                {/* Icono semántico de tipo */}
                <div className={styles.iconoSemanticoTipo}>
                  {getTypeBadge(item.type)}
                </div>

                {/* Contenido textual */}
                <div className={styles.contenidoTextual}>
                  <div className={styles.contenidoTextualDiv}>
                    <span className={styles.contenidoTextualDivSpan}>
                      {item.title}
                    </span>
                    <span className={styles.contenidoTextualDivSpan2}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                    </span>
                  </div>
                  <p className={styles.contenidoTextualP}>
                    {item.body}
                  </p>
                </div>

                {/* Botón para alternar leído/no leído */}
                <button
                  type="button"
                  onClick={(e) => handleToggleRead(item.id, e)}
                  className="btn-icon"
                  style={{ flexShrink: 0, width: 26, height: 26 }}
                  title={item.read ? 'Marcar como no leída' : 'Marcar como leída'}
                >
                  <div
                    className={styles.botonAlternarLeidoNoDiv} style={{ backgroundColor: item.read ? 'var(--interactive-muted)' : 'var(--brand)' }}
                  />
                </button>
              </div>
            ))
          ) : (
            <div className={styles.listaNotificacionesDiv2}>
              <Bell size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
              <div className={styles.noHayNotificacionesAqui}>No hay notificaciones aquí</div>
              <div className={styles.listaNotificacionesDiv2Div}>
                Estás al día con todas las menciones y mensajes de tus servidores.
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
};
