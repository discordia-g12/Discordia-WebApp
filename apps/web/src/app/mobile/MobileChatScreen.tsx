
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
import styles from './MobileChatScreen.module.css';

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
    <div className={styles.root}>
      {/* Header de Chat */}
      <div className={styles.headerChat}>
        <div className={styles.headerChatDiv}>
          <button
            type="button"
            onClick={() => setScreen(activeServerId ? 'channels' : 'home')}
            className="btn-icon"
            aria-label="Volver a los canales"
          >
            <ArrowLeft size={20} />
          </button>
          <Hash size={18} style={{ color: 'var(--interactive-normal)', flexShrink: 0 }} />
          <div className={styles.headerChatDivDiv}>
            <span className={styles.headerChatDivDivSpan}>
              {activeChannel ? activeChannel.name : activeDm?.recipient?.displayName || 'chat'}
            </span>
            {activeChannel?.topic && (
              <span className={styles.headerChatDivDivSpan2}>
                {activeChannel.topic}
              </span>
            )}
          </div>
        </div>

        <div className={styles.headerChatDiv2}>
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
      <div className={styles.flujoMensajesScroll}>
        {channelMessages.length > 0 ? (
          channelMessages.map((msg) => {
            const author = msg.author || currentUser;
            return (
              <div
                key={msg.id}
                className={styles.flujoMensajesScrollDiv}
              >
                <img
                  src={author.avatarUrl || author.avatar}
                  alt={author.displayName}
                  className={styles.flujoMensajesScrollDivImg}
                />
                <div className={styles.flujoMensajesScrollDivDiv}>
                  <div className={styles.flujoMensajesScrollDivDivDiv}>
                    <span className={styles.flujoMensajesScrollDivDivDivSpan}>
                      {author.displayName}
                    </span>
                    <span className={styles.flujoMensajesScrollDivDivDivSpan2}>
                      {formatMessageTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <div className={styles.flujoMensajesScrollDivDivDiv2}>
                    {msg.content}
                  </div>

                  {/* Adjuntos opcionales */}
                  {msg.attachments?.map((att) => (
                    <div key={att.id} className={styles.flujoMensajesScrollDivDivDiv3}>
                      <img
                        src={att.url}
                        alt={att.name}
                        className={styles.flujoMensajesScrollDivDivDiv3Img}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.flujoMensajesScrollDiv2}>
            <Hash size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
            <h4 className={styles.flujoMensajesScrollDiv2H4}>
              ¡Bienvenido a #{activeChannel?.name || 'chat'}!
            </h4>
            <p className={styles.flujoMensajesScrollDiv2P}>
              Este es el inicio del canal #{activeChannel?.name || 'chat'}.
            </p>
          </div>
        )}
      </div>

      {/* Barra inferior de entrada de texto */}
      <form
        onSubmit={handleSendMessage}
        className={styles.barraInferiorEntradaTexto}
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
