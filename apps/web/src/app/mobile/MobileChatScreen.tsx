
import {
  ArrowLeft,
  Users,
  Search,
  Hash,
  Plus,
  Send,
  Smile,
} from 'lucide-react';
import { formatMessageTimestamp } from './shared';
import type { MobileShellState } from './useMobileShellState';

/** Sección "VISTA 1: CHAT" de MobileShell. */
export function MobileChatScreen({ s }: { s: MobileShellState }) {
  const {
    currentUser,
    onOpenModal,
    setScreen,
    activeServerId,
    setActiveSheet,
    chatInput,
    setChatInput,
    activeChannel,
    activeDm,
    handleSendMessage,
    channelMessages,
  } = s;
  return (
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
  );
}
