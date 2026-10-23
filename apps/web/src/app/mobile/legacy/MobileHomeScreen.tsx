
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
} from '../../../types';
import type { MobileShellState } from './useMobileShellState';
import styles from './MobileHomeScreen.module.css';

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
    <div className={styles.root}>
      {/* RAIL LATERAL COMPACTO A LA IZQUIERDA */}
      <div className={styles.railLateralCompactoIzquierda}>
        {/* Botón Home / Mensajes Directos */}
        <div className={styles.botonHomeMensajesDirectos}>
          {screen === 'home' && (
            <div className={styles.botonHomeMensajesDirectosDiv} />
          )}
          <button
            type="button"
            onClick={() => setScreen('home')}
            className={styles.mensajesDirectos} style={{ borderRadius: screen === 'home' ? 'var(--radius-md)' : 'var(--radius-full)', backgroundColor: screen === 'home' ? 'var(--brand)' : 'var(--bg-primary)', border: 'none' }}
            aria-label="Mensajes Directos"
          >
            <Compass size={22} />
          </button>
        </div>

        <div className={styles.railLateralCompactoIzquierdaDiv} />

        {/* Lista de Servidores con Badges de no leídos */}
        <div className={styles.listaServidoresBadgesNo}>
          {servers.map((server) => {
            const isActive = screen === 'channels' && server.id === activeServerId;
            const unread = server.unreadCount || 0;
            return (
              <div
                key={server.id}
                className={styles.botonHomeMensajesDirectos}
              >
                {isActive && (
                  <div className={styles.botonHomeMensajesDirectosDiv} />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveServerId(server.id);
                    setScreen('channels');
                  }}
                  className={styles.botonHomeMensajesDirectosButton} style={{ borderRadius: isActive ? 'var(--radius-md)' : 'var(--radius-full)', border: 'none' }}
                  aria-label={server.name}
                >
                  <img
                    src={server.iconUrl || server.icon}
                    alt={server.name}
                    className={styles.botonHomeMensajesDirectosButtonImg}
                  />
                  {unread > 0 && (
                    <div className={styles.botonHomeMensajesDirectosButtonDiv}>
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
            className={styles.botonAnadirServidor}
            aria-label="Añadir un servidor"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL: HEADER, CONTENIDO Y USER PILL */}
      <div className={styles.contenedorPrincipalHeaderContenido}>
        {/* CABECERA CON MENÚ DE SERVIDOR O TITULAR DE HOME */}
        <div className={styles.cabeceraMenuServidorTitular}>
          {screen === 'channels' ? (
            <button
              type="button"
              onClick={() => setActiveSheet('server')}
              className={styles.cabeceraMenuServidorTitularButton}
            >
              <span className={styles.cabeceraMenuServidorTitularButtonSpan}>
                {activeServer.name}
              </span>
              <ChevronDown size={18} style={{ flexShrink: 0 }} />
            </button>
          ) : (
            <span className={styles.mensajesDirectos2}>
              Mensajes Directos
            </span>
          )}

          {/* Botones de acción rápida en cabecera */}
          <div className={styles.botonesAccionRapidaCabecera}>
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
        <div className={styles.contenidoScrollablePantalla}>
          {screen === 'channels' ? (
            /* PANTALLA CHANNELS: Categorías y canales del servidor */
            <div className={styles.contenidoScrollablePantallaDiv}>
              {activeServer.categories.map((cat) => (
                <div key={cat.id}>
                  <div className={styles.contenidoScrollablePantallaDivDiv}>
                    {cat.name}
                  </div>

                  <div className={styles.contenidoScrollablePantallaDivDiv2}>
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
                          className={styles.contenidoScrollablePantallaDivDiv2Div} style={{ backgroundColor: isSelected ? 'var(--bg-modifier-selected)' : 'transparent', color: isSelected ? 'var(--header-primary)' : 'var(--interactive-normal)' }}
                        >
                          <div className={styles.contenidoScrollablePantallaDivDiv2DivDiv}>
                            {ch.type === 'voice' ? (
                              <Volume2 size={18} style={{ color: 'var(--interactive-normal)', flexShrink: 0 }} />
                            ) : ch.type === 'announcement' ? (
                              <Radio size={18} style={{ color: 'var(--interactive-normal)', flexShrink: 0 }} />
                            ) : (
                              <Hash size={18} style={{ color: 'var(--interactive-normal)', flexShrink: 0 }} />
                            )}
                            <span className={styles.contenidoScrollablePantallaDivDiv2DivDivSpan}>
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
            <div className={styles.contenidoScrollablePantallaDiv2}>
              <div className={styles.mensajesDirectos3}>
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
                    className={styles.contenidoScrollablePantallaDiv2Div}
                  >
                    <div className={styles.contenidoScrollablePantallaDiv2DivDiv}>
                      <img
                        src={recipient.avatarUrl || recipient.avatar}
                        alt={recipient.displayName}
                        className={styles.contenidoScrollablePantallaDiv2DivDivImg}
                      />
                      <span
                        className={`status-dot ${recipient.status || 'offline'}`}
                        style={{ position: 'absolute', bottom: -1, right: -1 }}
                      />
                    </div>
                    <div className={styles.contenidoScrollablePantallaDiv2DivDiv2}>
                      <div className={styles.contenidoScrollablePantallaDiv2DivDiv2Div}>
                        <span className={styles.contenidoScrollablePantallaDiv2DivDiv2DivSpan}>
                          {recipient.displayName}
                        </span>
                        <span className={styles.contenidoScrollablePantallaDiv2DivDiv2DivSpan2}>
                          {dm.lastMessageTimestamp ? new Date(dm.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className={styles.contenidoScrollablePantallaDiv2DivDiv2Div2}>
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
        <div className={styles.barraFlotanteUsuarioUser}>
          <div
            onClick={() => setActiveSheet('profile')}
            className={styles.barraFlotanteUsuarioUserDiv}
          >
            <div className={styles.contenidoScrollablePantallaDiv2DivDiv}>
              <img
                src={currentUser.avatarUrl || currentUser.avatar}
                alt={currentUser.displayName}
                className={styles.contenidoScrollablePantallaDiv2DivDivImg2}
              />
              <span
                className={`status-dot ${currentUser.status || 'online'}`}
                style={{ position: 'absolute', bottom: -1, right: -1 }}
              />
            </div>
            <div className={styles.barraFlotanteUsuarioUserDivDiv}>
              <div className={styles.barraFlotanteUsuarioUserDivDivDiv}>
                {currentUser.displayName}
              </div>
              <div className={styles.barraFlotanteUsuarioUserDivDivDiv2}>
                {currentUser.customStatus || `@${currentUser.username}`}
              </div>
            </div>
          </div>

          {/* Botones de acción rápida de usuario */}
          <div className={styles.botonesAccionRapidaUsuario}>
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
