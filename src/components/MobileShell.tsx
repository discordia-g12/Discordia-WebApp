import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Users,
  Search,
  Hash,
  Volume2,
  Radio,
  Plus,
  Send,
  Smile,
  Mic,
  MicOff,
  Headphones,
  Bell,
  UserPlus,
  Compass,
  Check,
  Zap,
  LogOut,
  Trash2,
  PhoneOff,
  Video,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Server,
  User,
  Channel,
  Message,
  DirectMessage,
  Modal,
  ConfirmAction,
} from '../types';


/* ==========================================================================
   TIPOS Y PROPS PARA EL SHELL MÓVIL
   ========================================================================== */

export type MobileScreen = 'home' | 'channels' | 'chat' | 'voice';
export type ActiveSheet = 'none' | 'server' | 'profile' | 'member' | 'add-friend';

export interface MobileShellProps {
  initialScreen?: MobileScreen;
  servers?: Server[];
  currentUser?: User;
  onOpenModal?: (modal: Modal, extra?: unknown) => void;
  onConfirmAction?: (action: ConfirmAction, targetName?: string) => void;
}

function formatMessageTimestamp(isoDate?: string): string {
  if (!isoDate) return '12:00';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return timeStr;
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year} ${timeStr}`;
}

/* ==========================================================================
   COMPONENTE AUXILIAR: BOTTOM SHEET DESLIZABLE
   ========================================================================== */

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string | number;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '85vh',
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          maxHeight,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-floating)',
          animation: 'slideUp 0.25s ease',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Asa o barra de arrastre superior */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px 0' }}>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'var(--interactive-muted)',
            }}
          />
        </div>

        {/* Cabecera opcional */}
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 20px 12px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--header-primary)', margin: 0 }}>
              {title}
            </h3>
            <button onClick={onClose} className="btn-icon" aria-label="Cerrar panel">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Contenido */}
        <div style={{ padding: '12px 20px' }}>{children}</div>
      </div>
    </div>
  );
};

/* ==========================================================================
   COMPONENTE PRINCIPAL: MOBILE SHELL
   ========================================================================== */

export const MobileShell: React.FC<MobileShellProps> = ({
  initialScreen = 'channels',
  servers = [],
  currentUser = { id: '' } as any,
  onOpenModal,
  onConfirmAction,
}) => {
  // Estados de navegación
  const [screen, setScreen] = useState<MobileScreen>(initialScreen);
  const [activeServerId, setActiveServerId] = useState<string>(servers[0]?.id || 's1');
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDmId, setActiveDmId] = useState<string>('dm-1');
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none');

  // Estados de audio y presencia
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Estados de configuración de servidor en sheet
  const [hideMutedChannels, setHideMutedChannels] = useState(false);
  const [allowMemberDMs, setAllowMemberDMs] = useState(true);

  // Mensaje en chat activo
  const [chatInput, setChatInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});

  // Servidor y Canal actuales
  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0];
  const allChannels = activeServer.categories.flatMap((cat) => cat.channels);
  const activeChannel = allChannels.find((c) => c.id === activeChannelId) || allChannels[0];
  const activeDm = ([] as DirectMessage[]).find((d) => d.id === activeDmId);

  // Manejo de envío de mensajes en Chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChannelId) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      channelId: activeChannelId,
      authorId: currentUser.id,
      author: currentUser,
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
      type: 'normal',
    };

    setLocalMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMessage],
    }));

    setChatInput('');
  };

  const channelMessages = activeChannelId ? (localMessages[activeChannelId] || []) : [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100%',
        backgroundColor: 'var(--bg-tertiary)',
        color: 'var(--text-normal)',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* ====================================================================
          VISTA 1: CHAT A PANTALLA COMPLETA
          ==================================================================== */}
      {screen === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
          {/* Header de Chat */}
          <div
            style={{
              height: 52,
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => setScreen(activeServerId ? 'channels' : 'home')}
                className="btn-icon"
                aria-label="Volver a los canales"
              >
                <ArrowLeft size={20} />
              </button>
              <Hash size={18} style={{ color: 'var(--interactive-normal)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 700,
                    color: 'var(--header-primary)',
                    fontSize: 15,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                >
                  {activeChannel ? activeChannel.name : activeDm?.recipient?.displayName || 'chat'}
                </span>
                {activeChannel?.topic && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    }}
                  >
                    {activeChannel.topic}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                onClick={() => onOpenModal?.('search')}
                className="btn-icon"
                aria-label="Buscar en el chat"
              >
                <Search size={19} />
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('member')}
                className="btn-icon"
                aria-label="Ver miembros del servidor"
              >
                <Users size={19} />
              </button>
            </div>
          </div>

          {/* Flujo de mensajes con scroll */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              backgroundColor: 'var(--bg-chat)',
            }}
          >
            {channelMessages.length > 0 ? (
              channelMessages.map((msg) => {
                const author = msg.author || currentUser;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '4px 16px',
                      gap: 12,
                    }}
                  >
                    <img
                      src={author.avatarUrl || author.avatar}
                      alt={author.displayName}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-full)',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--header-primary)', fontSize: 13 }}>
                          {author.displayName}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted, #949ba4)' }}>
                          {formatMessageTimestamp(msg.timestamp)}
                        </span>
                      </div>
                      <div
                        style={{
                          color: 'var(--text-normal)',
                          fontSize: 13,
                          marginTop: 2,
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                          userSelect: 'text',
                        }}
                      >
                        {msg.content}
                      </div>

                      {/* Adjuntos opcionales */}
                      {msg.attachments?.map((att) => (
                        <div key={att.id} style={{ marginTop: 6, maxWidth: 280 }}>
                          <img
                            src={att.url}
                            alt={att.name}
                            style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, padding: 16 }}>
                <Hash size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                <h4 style={{ color: 'var(--header-primary)', fontSize: 16 }}>
                  ¡Bienvenido a #{activeChannel?.name || 'chat'}!
                </h4>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Este es el inicio del canal #{activeChannel?.name || 'chat'}.
                </p>
              </div>
            )}
          </div>

          {/* Barra inferior de entrada de texto */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <button
              type="button"
              className="btn-icon"
              style={{
                width: 32,
                height: 32,
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-full)',
              }}
              title="Añadir adjunto"
            >
              <Plus size={18} />
            </button>
            <input
              type="text"
              className="discord-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Enviar mensaje en #${activeChannel?.name || 'chat'}`}
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '8px 14px',
                fontSize: 13,
              }}
            />
            <button
              type="button"
              className="btn-icon"
              style={{ color: 'var(--interactive-normal)' }}
              title="Emojis"
            >
              <Smile size={20} />
            </button>
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="btn-icon"
              style={{
                backgroundColor: chatInput.trim() ? 'var(--brand)' : 'transparent',
                color: chatInput.trim() ? 'white' : 'var(--interactive-muted)',
                borderRadius: 'var(--radius-full)',
                width: 34,
                height: 34,
              }}
              aria-label="Enviar mensaje"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* ====================================================================
          VISTA 2: VOICE A PANTALLA COMPLETA
          ==================================================================== */}
      {screen === 'voice' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            backgroundColor: '#111214',
          }}
        >
          {/* Header de Voz */}
          <div
            style={{
              height: 52,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setScreen('channels')}
                className="btn-icon"
                aria-label="Volver"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--header-primary)' }}>
                  {activeChannel?.name || 'Sala de Voz'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--status-online)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="status-dot online" style={{ width: 6, height: 6 }} />
                  RTC Conectado (64 kbps)
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSheet('member')}
              className="btn-icon"
              aria-label="Ver participantes"
            >
              <Users size={19} />
            </button>
          </div>

          {/* Cuadrícula de participantes */}
          <div
            style={{
              flex: 1,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12,
              alignContent: 'center',
            }}
          >
            {/* Usuario actual */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: isMuted ? '1px solid rgba(255, 255, 255, 0.08)' : '2px solid var(--status-online)',
              }}
            >
              <img
                src={currentUser.avatarUrl || currentUser.avatar}
                alt={currentUser.displayName}
                style={{ width: 60, height: 60, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
              />
              <span style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
                {currentUser.displayName} (Tú)
              </span>
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: isMuted ? 'var(--danger)' : 'rgba(0,0,0,0.5)',
                  padding: 4,
                  borderRadius: 'var(--radius-full)',
                  color: 'white',
                  display: 'flex',
                }}
              >
                {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
              </div>
            </div>

            {/* Participante de prueba */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <img
                src={""}
                alt="Perfil"
                style={{ width: 60, height: 60, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
              />
              <span style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
                Perfil
              </span>
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  padding: 4,
                  borderRadius: 'var(--radius-full)',
                  color: 'white',
                  display: 'flex',
                }}
              >
                <Mic size={12} />
              </div>
            </div>
          </div>

          {/* Controles de Voz Flotantes */}
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
            }}
          >
            {/* Micrófono */}
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-full)',
                backgroundColor: isMuted ? 'var(--danger)' : 'var(--bg-primary)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={isMuted ? 'Reactivar micrófono' : 'Silenciar micrófono'}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Ensordecer */}
            <button
              type="button"
              onClick={() => setIsDeafened((d) => !d)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-full)',
                backgroundColor: isDeafened ? 'var(--danger)' : 'var(--bg-primary)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={isDeafened ? 'Reactivar audio' : 'Ensordecer'}
            >
              <Headphones size={20} />
            </button>

            {/* Vídeo / Pantalla */}
            <button
              type="button"
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-primary)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Compartir cámara"
            >
              <Video size={20} />
            </button>

            {/* Desconectar */}
            <button
              type="button"
              onClick={() => setScreen('channels')}
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--danger)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Desconectar llamada"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          VISTAS 3 & 4: HOME Y CHANNELS (Con Rail Lateral y Header Superior)
          ==================================================================== */}
      {(screen === 'home' || screen === 'channels') && (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
          {/* RAIL LATERAL COMPACTO A LA IZQUIERDA */}
          <div
            style={{
              width: 64,
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 0',
              gap: 8,
              borderRight: '1px solid rgba(0, 0, 0, 0.2)',
              flexShrink: 0,
            }}
          >
            {/* Botón Home / Mensajes Directos */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {screen === 'home' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    width: 4,
                    height: 36,
                    backgroundColor: 'white',
                    borderTopRightRadius: 4,
                    borderBottomRightRadius: 4,
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => setScreen('home')}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: screen === 'home' ? 'var(--radius-md)' : 'var(--radius-full)',
                  backgroundColor: screen === 'home' ? 'var(--brand)' : 'var(--bg-primary)',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'border-radius 0.15s, background-color 0.15s',
                }}
                aria-label="Mensajes Directos"
              >
                <Compass size={22} />
              </button>
            </div>

            <div style={{ width: 32, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

            {/* Lista de Servidores con Badges de no leídos */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, width: '100%', alignItems: 'center' }}>
              {servers.map((server) => {
                const isActive = screen === 'channels' && server.id === activeServerId;
                const unread = server.unreadCount || 0;
                return (
                  <div
                    key={server.id}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
                  >
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          width: 4,
                          height: 36,
                          backgroundColor: 'white',
                          borderTopRightRadius: 4,
                          borderBottomRightRadius: 4,
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveServerId(server.id);
                        setScreen('channels');
                      }}
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: isActive ? 'var(--radius-md)' : 'var(--radius-full)',
                        backgroundColor: 'var(--bg-primary)',
                        border: 'none',
                        overflow: 'visible',
                        padding: 0,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'border-radius 0.15s ease',
                      }}
                      aria-label={server.name}
                    >
                      <img
                        src={server.iconUrl || server.icon}
                        alt={server.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                      />
                      {unread > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: -4,
                            right: -4,
                            backgroundColor: 'var(--status-danger, #ed4245)',
                            color: 'white',
                            fontSize: 11,
                            fontWeight: 800,
                            lineHeight: 1,
                            padding: '0 5px',
                            minWidth: 18,
                            height: 18,
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '3px solid var(--bg-tertiary, #202225)',
                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.5)',
                            zIndex: 5,
                          }}
                        >
                          {unread}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}

              {/* Botón de añadir servidor (+) */}
              <button
                type="button"
                onClick={() => onOpenModal?.('create-server')}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--status-online)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'border-radius 0.15s, background-color 0.15s, color 0.15s',
                }}
                aria-label="Añadir un servidor"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* CONTENEDOR PRINCIPAL: HEADER, CONTENIDO Y USER PILL */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'var(--bg-secondary)' }}>
            {/* CABECERA CON MENÚ DE SERVIDOR O TITULAR DE HOME */}
            <div
              style={{
                height: 52,
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              {screen === 'channels' ? (
                <button
                  type="button"
                  onClick={() => setActiveSheet('server')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'none',
                    border: 'none',
                    color: 'var(--header-primary)',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                    padding: 0,
                    minWidth: 0,
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeServer.name}
                  </span>
                  <ChevronDown size={18} style={{ flexShrink: 0 }} />
                </button>
              ) : (
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--header-primary)' }}>
                  Mensajes Directos
                </span>
              )}

              {/* Botones de acción rápida en cabecera */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => onOpenModal?.('search')}
                  className="btn-icon"
                  aria-label="Buscar"
                >
                  <Search size={19} />
                </button>
                {screen === 'channels' ? (
                  <button
                    type="button"
                    onClick={() => setActiveSheet('member')}
                    className="btn-icon"
                    aria-label="Ver miembros"
                  >
                    <Users size={19} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveSheet('add-friend')}
                    className="btn-icon"
                    aria-label="Añadir amigo"
                  >
                    <UserPlus size={19} />
                  </button>
                )}
              </div>
            </div>

            {/* CONTENIDO SCROLLABLE DE LA PANTALLA */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
              {screen === 'channels' ? (
                /* PANTALLA CHANNELS: Categorías y canales del servidor */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activeServer.categories.map((cat) => (
                    <div key={cat.id}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          padding: '4px 8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {cat.name}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                        {cat.channels.map((ch: Channel) => {
                          const isSelected = ch.id === activeChannelId;
                          return (
                            <div
                              key={ch.id}
                              onClick={() => {
                                setActiveChannelId(ch.id);
                                if (ch.type === 'voice') {
                                  setScreen('voice');
                                } else {
                                  setScreen('chat');
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: isSelected ? 'var(--bg-modifier-selected)' : 'transparent',
                                color: isSelected ? 'var(--header-primary)' : 'var(--interactive-normal)',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                {ch.type === 'voice' ? (
                                  <Volume2 size={18} style={{ color: 'var(--interactive-normal)', flexShrink: 0 }} />
                                ) : ch.type === 'announcement' ? (
                                  <Radio size={18} style={{ color: 'var(--interactive-normal)', flexShrink: 0 }} />
                                ) : (
                                  <Hash size={18} style={{ color: 'var(--interactive-normal)', flexShrink: 0 }} />
                                )}
                                <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {ch.name}
                                </span>
                              </div>

                              {ch.unreadCount && ch.unreadCount > 0 ? (
                                <span className="badge badge-brand" style={{ fontSize: 10 }}>
                                  {ch.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* PANTALLA HOME: Lista de Mensajes Directos y Amigos */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase' }}>
                    MENSAJES DIRECTOS
                  </div>
                  {[].map((dm: DirectMessage) => {
                    const recipient = dm.recipient || ({ id: 'unknown' } as any);
                    return (
                      <div
                        key={dm.id}
                        onClick={() => {
                          setActiveDmId(dm.id);
                          setScreen('chat');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <img
                            src={recipient.avatarUrl || recipient.avatar}
                            alt={recipient.displayName}
                            style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                          />
                          <span
                            className={`status-dot ${recipient.status || 'offline'}`}
                            style={{ position: 'absolute', bottom: -1, right: -1 }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--header-primary)' }}>
                              {recipient.displayName}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {dm.lastMessageTimestamp ? new Date(dm.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: 2,
                            }}
                          >
                            {dm.lastMessage || 'Conversación directa iniciada.'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BARRA FLOTANTE DE USUARIO (USER PILL) */}
            <div
              style={{
                height: 54,
                padding: '0 12px',
                backgroundColor: 'var(--bg-secondary-alt)',
                borderTop: '1px solid rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                onClick={() => setActiveSheet('profile')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={currentUser.avatarUrl || currentUser.avatar}
                    alt={currentUser.displayName}
                    style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                  />
                  <span
                    className={`status-dot ${currentUser.status || 'online'}`}
                    style={{ position: 'absolute', bottom: -1, right: -1 }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--header-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.displayName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.customStatus || `@${currentUser.username}`}
                  </div>
                </div>
              </div>

              {/* Botones de acción rápida de usuario */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  className="btn-icon"
                  style={{ color: isMuted ? 'var(--danger)' : 'var(--interactive-normal)' }}
                  title={isMuted ? 'Desmutear' : 'Mutear'}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeafened((d) => !d)}
                  className="btn-icon"
                  style={{ color: isDeafened ? 'var(--danger)' : 'var(--interactive-normal)' }}
                  title={isDeafened ? 'Activar sonido' : 'Ensordecer'}
                >
                  <Headphones size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenModal?.('search')}
                  className="btn-icon"
                  title="Notificaciones"
                >
                  <Bell size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          BOTTOM SHEETS DESLIZABLES
          ==================================================================== */}

      {/* 1. SERVER SHEET */}
      <BottomSheet
        isOpen={activeSheet === 'server'}
        onClose={() => setActiveSheet('none')}
        title={activeServer.name}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info del servidor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={activeServer.iconUrl || activeServer.icon}
              alt={activeServer.name}
              style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--header-primary)' }}>
                {activeServer.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {activeServer.members.length} miembros • 5 en línea
              </div>
              {activeServer.boostLevel > 0 && (
                <span className="badge badge-boost" style={{ marginTop: 4 }}>
                  Nivel {activeServer.boostLevel} • {activeServer.boostCount} Mejoras
                </span>
              )}
            </div>
          </div>

          {/* Cuadrícula de Acciones Rápidas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
                onOpenModal?.('invite');
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '12px 6px',
                backgroundColor: 'var(--bg-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--interactive-normal)',
                cursor: 'pointer',
              }}
            >
              <UserPlus size={20} color="var(--brand)" />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Invitar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
                onConfirmAction?.('ban-member', 'Servidor Mejorado');
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '12px 6px',
                backgroundColor: 'var(--bg-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--interactive-normal)',
                cursor: 'pointer',
              }}
            >
              <Zap size={20} color="#f47fff" />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Mejorar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '12px 6px',
                backgroundColor: 'var(--bg-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'var(--interactive-normal)',
                cursor: 'pointer',
              }}
            >
              <Bell size={20} color="var(--status-idle)" />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Notificaciones</span>
            </button>
          </div>

          {/* Toggles de configuración */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: 'var(--bg-primary)', padding: 12, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--header-primary)' }}>
                Ocultar canales silenciados
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={hideMutedChannels}
                  onChange={(e) => setHideMutedChannels(e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--header-primary)' }}>
                Permitir mensajes directos de miembros
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={allowMemberDMs}
                  onChange={(e) => setAllowMemberDMs(e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>
          </div>

          {/* Acciones de peligro */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
                onConfirmAction?.('leave-server', activeServer.name);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                color: 'var(--danger)',
                background: 'none',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <LogOut size={18} /> Abandonar Servidor
            </button>

            {activeServer.ownerId === currentUser.id && (
              <button
                type="button"
                onClick={() => {
                  setActiveSheet('none');
                  onConfirmAction?.('delete-server', activeServer.name);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  color: 'var(--danger)',
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Trash2 size={18} /> Eliminar Servidor
              </button>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* 2. PROFILE SHEET */}
      <BottomSheet
        isOpen={activeSheet === 'profile'}
        onClose={() => setActiveSheet('none')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Banner y Avatar */}
          <div
            style={{
              height: 70,
              borderRadius: 'var(--radius-md)',
              backgroundColor: currentUser.bannerColor || 'var(--brand)',
              position: 'relative',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                position: 'absolute',
                bottom: -24,
                left: 14,
                width: 60,
                height: 60,
                borderRadius: 'var(--radius-full)',
                border: '4px solid var(--bg-secondary)',
                overflow: 'hidden',
              }}
            >
              <img
                src={currentUser.avatarUrl || currentUser.avatar}
                alt={currentUser.displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Datos del usuario y saldo de puntos */}
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--header-primary)' }}>
              {currentUser.displayName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              @{currentUser.username}#{currentUser.discriminator || '1024'}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'var(--brand-light)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                marginTop: 8,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--brand)',
              }}
            >
              <span>💠 Saldo: {currentUser.points || 840} Puntos Discordia</span>
            </div>
          </div>

          {/* Tarjeta de promoción Nitro */}
          <div
            style={{
              background: 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              color: 'white',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
              <Sparkles size={18} /> Consigue Discordia Nitro
            </div>
            <p style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
              Desbloquea emojis personalizados globales, transmisiones HD a 60fps y 2 mejoras de servidor mensuales.
            </p>
          </div>

          {/* Botones de acción */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setActiveSheet('none');
              onOpenModal?.('user-profile');
            }}
          >
            Editar Perfil
          </button>
        </div>
      </BottomSheet>

      {/* 3. MEMBER SHEET */}
      <BottomSheet
        isOpen={activeSheet === 'member'}
        onClose={() => setActiveSheet('none')}
        title={`Miembros del Servidor (${activeServer.members.length})`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Sección En línea */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-positive)', marginBottom: 8, textTransform: 'uppercase' }}>
              EN LÍNEA — {activeServer.members.filter((m) => m.status !== 'offline').length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeServer.members
                .filter((m) => m.status !== 'offline')
                .map((member) => (
                  <div
                    key={member.id}
                    onClick={() => {
                      setActiveSheet('none');
                      onOpenModal?.('user-profile', member);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img
                        src={member.avatarUrl || member.avatar}
                        alt={member.displayName}
                        style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                      <span
                        className={`status-dot ${member.status}`}
                        style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8 }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
                        {member.displayName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {member.customStatus || `@${member.username}`}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Sección Desconectados */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
              DESCONECTADOS — {activeServer.members.filter((m) => m.status === 'offline').length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeServer.members
                .filter((m) => m.status === 'offline')
                .map((member) => (
                  <div
                    key={member.id}
                    onClick={() => {
                      setActiveSheet('none');
                      onOpenModal?.('user-profile', member);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      opacity: 0.7,
                    }}
                  >
                    <img
                      src={member.avatarUrl || member.avatar}
                      alt={member.displayName}
                      style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
                        {member.displayName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        @{member.username}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* 4. ADD FRIEND SHEET */}
      <BottomSheet
        isOpen={activeSheet === 'add-friend'}
        onClose={() => setActiveSheet('none')}
        title="Añadir Amigo"
      >
        <AddFriendSheetContent />
      </BottomSheet>
    </div>
  );
};

/* ==========================================================================
   SUBCOMPONENTE: CONTENIDO DE ADD FRIEND SHEET
   ========================================================================== */

const AddFriendSheetContent: React.FC = () => {
  const [friendTag, setFriendTag] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendTag.trim()) return;
    setIsSent(true);
    setTimeout(() => {
      setFriendTag('');
      setIsSent(false);
    }, 2500);
  };

  const handleAddSuggested = (id: string) => {
    setAddedIds((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
        Puedes añadir amigos mediante su nombre de usuario de Discordia.
      </p>

      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="text"
          className="discord-input"
          placeholder="@usuario#0000 o nombre_de_usuario"
          value={friendTag}
          onChange={(e) => setFriendTag(e.target.value)}
        />
        <button
          type="submit"
          disabled={!friendTag.trim()}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {isSent ? '¡Solicitud Enviada!' : 'Enviar solicitud de amistad'}
        </button>
      </form>

      {isSent && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(35, 165, 90, 0.15)',
            border: '1px solid var(--status-online)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-positive)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Check size={16} /> ¡Solicitud de amistad enviada con éxito!
        </div>
      )}

      {/* Sugerencias de amigos */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
          SUGERENCIAS DE AMIGOS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([] as any[]).slice(2, 6).map((user) => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={user.avatarUrl || user.avatar}
                  alt={user.displayName}
                  style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
                    {user.displayName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    @{user.username}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddSuggested(user.id)}
                disabled={addedIds[user.id]}
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  backgroundColor: addedIds[user.id] ? 'var(--bg-modifier-selected)' : 'var(--brand)',
                  color: addedIds[user.id] ? 'var(--text-positive)' : 'white',
                }}
              >
                {addedIds[user.id] ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} /> Enviada
                  </span>
                ) : (
                  'Añadir'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
