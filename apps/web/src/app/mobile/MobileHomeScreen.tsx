
import {
  ChevronDown,
  Users,
  Search,
  Hash,
  Volume2,
  Radio,
  Plus,
  Mic,
  MicOff,
  Headphones,
  Bell,
  UserPlus,
  Compass,
} from 'lucide-react';
import {
  Channel,
  DirectMessage,
} from '../../types';
import type { MobileShellState } from './useMobileShellState';

/** Sección "VISTAS 3 & 4" de MobileShell. */
export function MobileHomeScreen({ s }: { s: MobileShellState }) {
  const {
    servers,
    currentUser,
    onOpenModal,
    screen,
    setScreen,
    activeServerId,
    setActiveServerId,
    activeChannelId,
    setActiveChannelId,
    setActiveDmId,
    setActiveSheet,
    isMuted,
    setIsMuted,
    isDeafened,
    setIsDeafened,
    activeServer,
  } = s;
  return (
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
  );
}
