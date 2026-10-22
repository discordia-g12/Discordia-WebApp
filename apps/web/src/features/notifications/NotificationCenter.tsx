import React, { useState, useEffect,  } from 'react';
import {
  X, Check, Bell, Smile, MessageSquare, CornerDownLeft, AtSign, 
} from 'lucide-react';
import { Notification} from '../../types';
import { ModalOverlay } from '../../ui/ModalOverlay';

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
          <span style={{ backgroundColor: 'var(--brand)', color: 'white', padding: 4, borderRadius: 4, display: 'flex' }}>
            <AtSign size={13} />
          </span>
        );
      case 'dm':
        return (
          <span style={{ backgroundColor: 'var(--status-online)', color: 'white', padding: 4, borderRadius: 4, display: 'flex' }}>
            <MessageSquare size={13} />
          </span>
        );
      case 'reply':
        return (
          <span style={{ backgroundColor: 'var(--status-idle)', color: 'white', padding: 4, borderRadius: 4, display: 'flex' }}>
            <CornerDownLeft size={13} />
          </span>
        );
      case 'reaction':
        return (
          <span style={{ backgroundColor: '#eb459e', color: 'white', padding: 4, borderRadius: 4, display: 'flex' }}>
            <Smile size={13} />
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: 'var(--interactive-muted)', color: 'white', padding: 4, borderRadius: 4, display: 'flex' }}>
            <Bell size={13} />
          </span>
        );
    }
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={500}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 20px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            overflowX: 'auto',
          }}
        >
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
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filter === tab.id ? 'var(--brand)' : 'transparent',
                color: filter === tab.id ? 'white' : 'var(--interactive-normal)',
                transition: 'all 0.15s ease',
              }}
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
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: item.read ? 'var(--bg-secondary)' : 'var(--bg-modifier-selected)',
                  borderLeft: item.read ? '3px solid transparent' : '3px solid var(--brand)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {/* Icono semántico de tipo */}
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  {getTypeBadge(item.type)}
                </div>

                {/* Contenido textual */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--header-primary)' }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-normal)',
                      margin: '4px 0 0 0',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
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
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: item.read ? 'var(--interactive-muted)' : 'var(--brand)',
                    }}
                  />
                </button>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
              <Bell size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>No hay notificaciones aquí</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Estás al día con todas las menciones y mensajes de tus servidores.
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
};
