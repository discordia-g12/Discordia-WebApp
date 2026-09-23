import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Check,
  Copy,
  Search,
  Bell,
  Phone,
  PhoneOff,
  Hash,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  LogOut,
  Compass,
  Sparkles,
  Smile,
  MessageSquare,
  CornerDownLeft,
  ChevronRight,
  Upload,
  Zap,
  AtSign,
  UserX,
  Flag,
  Radio,
  Info,
} from 'lucide-react';
import {
  User,
  Server,
  ConfirmAction,
  Notification,
  Role,
} from '../types';
import {
  CURRENT_USER_ID,
  USERS,
  SERVERS,
} from '../data/mock';

/* ==========================================================================
   1. MODAL OVERLAY (Contenedor base con backdrop blur y cierre externo)
   ========================================================================== */

export interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string | number;
  className?: string;
  backdropBlur?: boolean;
}

/**
 * Contenedor modal con fondo difuminado y cierre automático al interactuar fuera.
 */
export const ModalOverlay: React.FC<ModalOverlayProps> = ({
  children,
  onClose,
  maxWidth = '480px',
  className = '',
  backdropBlur = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={`modal-overlay ${className}`}
      onClick={onClose}
      style={{
        backdropFilter: backdropBlur ? 'blur(6px)' : undefined,
        WebkitBackdropFilter: backdropBlur ? 'blur(6px)' : undefined,
      }}
    >
      <div
        className="modal-container"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
};

/* ==========================================================================
   2. CREATE SERVER MODAL (Asistente de 2 pasos)
   ========================================================================== */

export interface CreateServerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onCreateServer?: (serverData: { name: string; template: string; icon?: string }) => void;
  currentUser?: User;
}

const SERVER_TEMPLATES = [
  {
    id: 'custom',
    title: 'Crear mi propio servidor',
    description: 'Para mí y mis amigos o una comunidad personalizada.',
    icon: Compass,
    badge: 'Popular',
  },
  {
    id: 'gaming',
    title: 'Comunidad de Juegos',
    description: 'Canales de texto y voz preparados para partidas en vivo.',
    icon: Zap,
  },
  {
    id: 'creators',
    title: 'Comunidad de Creadores',
    description: 'Comparte proyectos, contenido multimedia y novedades.',
    icon: Sparkles,
  },
  {
    id: 'study',
    title: 'Grupo de Estudio',
    description: 'Espacio para compartir apuntes, debates y trabajo en equipo.',
    icon: Hash,
  },
];

const PRESET_ICONS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&auto=format&fit=crop&q=80',
];

/**
 * Asistente de 2 pasos para creación de servidores comunitarios y personales.
 */
export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen = true,
  onClose,
  onCreateServer,
  currentUser = USERS[CURRENT_USER_ID],
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [serverName, setServerName] = useState(`Servidor de ${currentUser?.displayName || 'Alex'}`);
  const [serverIcon, setServerIcon] = useState(PRESET_ICONS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setStep(2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setServerIcon(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    if (!serverName.trim()) return;
    onCreateServer?.({
      name: serverName.trim(),
      template: selectedTemplate,
      icon: serverIcon,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={460}>
      {/* Botón de cierre superior */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={onClose}
          className="btn-icon"
          aria-label="Cerrar modal"
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
        >
          <X size={20} />
        </button>

        {step === 1 ? (
          /* PASO 1: Selección de Plantilla */
          <div>
            <div className="modal-header" style={{ textAlign: 'center', paddingTop: 28 }}>
              <h2 className="modal-title" style={{ fontSize: 24 }}>Crea tu servidor</h2>
              <p className="modal-subtitle">
                Tu servidor es donde tú y tus amigos pasan el rato. Elige una plantilla o crea uno desde cero.
              </p>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SERVER_TEMPLATES.map((tmpl) => {
                const IconComponent = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleTemplateSelect(tmpl.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-modifier-selected)';
                      e.currentTarget.style.borderColor = 'var(--brand)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--brand-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--brand)',
                        }}
                      >
                        <IconComponent size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--header-primary)', fontSize: 14 }}>
                          {tmpl.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {tmpl.description}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: 'var(--interactive-normal)' }} />
                  </button>
                );
              })}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                ¿Tienes una invitación?{' '}
                <button
                  onClick={onClose}
                  className="btn-link"
                  style={{ color: 'var(--text-link)', fontSize: 13, fontWeight: 500 }}
                >
                  Únete a un servidor existente
                </button>
              </span>
            </div>
          </div>
        ) : (
          /* PASO 2: Personalización del Servidor */
          <div>
            <div className="modal-header" style={{ textAlign: 'center', paddingTop: 28 }}>
              <h2 className="modal-title" style={{ fontSize: 24 }}>Personaliza tu servidor</h2>
              <p className="modal-subtitle">
                Dale a tu nuevo servidor una identidad propia con un nombre y un icono representativo.
              </p>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Icono de subida interactivo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/png, image/jpeg, image/webp"
                  style={{ display: 'none' }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 'var(--radius-full)',
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '2px dashed var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                  title="Haz clic para subir un icono"
                >
                  {serverIcon ? (
                    <img
                      src={serverIcon}
                      alt="Icono del servidor"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Upload size={28} style={{ color: 'var(--brand)' }} />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                  >
                    <Upload size={20} color="white" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PRESET_ICONS.map((icon, idx) => (
                    <button
                      key={idx}
                      onClick={() => setServerIcon(icon)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 'var(--radius-full)',
                        border: serverIcon === icon ? '2px solid var(--brand)' : '1px solid transparent',
                        padding: 0,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'none',
                      }}
                      title="Elegir icono predeterminado"
                    >
                      <img src={icon} alt={`Predefinido ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  PNG, JPG o WebP de hasta 5 MB
                </span>
              </div>

              {/* Nombre del servidor */}
              <div>
                <label className="input-label" htmlFor="server-name-input">
                  NOMBRE DEL SERVIDOR
                </label>
                <input
                  id="server-name-input"
                  className="discord-input"
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="Ej: Indie Creators & Hackers"
                  maxLength={64}
                />
              </div>

              {/* Mensaje informativo de canales por defecto */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--brand)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  lineHeight: '1.4',
                }}
              >
                <Info size={16} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                <span>
                  Al crear el servidor, se generarán automáticamente los canales por defecto{' '}
                  <strong style={{ color: 'var(--header-primary)' }}>#general</strong> (texto) y{' '}
                  <strong style={{ color: 'var(--header-primary)' }}>General</strong> (voz).
                  Podrás añadir o modificar canales más adelante.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-link"
                onClick={() => setStep(1)}
              >
                Atrás
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!serverName.trim()}
              >
                Crear Servidor
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
};

/* ==========================================================================
   3. JOIN SERVER MODAL (Unirse a servidor por invitación con vista previa)
   ========================================================================== */

export interface JoinServerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onJoinServer?: (inviteCode: string) => void;
}

/**
 * Modal para introducir un enlace de invitación con vista previa en tiempo real.
 */
export const JoinServerModal: React.FC<JoinServerModalProps> = ({
  isOpen = true,
  onClose,
  onJoinServer,
}) => {
  const [inviteUrl, setInviteUrl] = useState('https://discordia.gg/indie-devs');
  const previewServer = SERVERS[0]; // Indie Developers

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUrl.trim()) return;
    onJoinServer?.(inviteUrl.trim());
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={460}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={onClose}
          className="btn-icon"
          aria-label="Cerrar modal"
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="modal-header" style={{ textAlign: 'center', paddingTop: 28 }}>
            <h2 className="modal-title" style={{ fontSize: 24 }}>Únete a un servidor</h2>
            <p className="modal-subtitle">
              Introduce una invitación o enlace a continuación para entrar a una comunidad existente.
            </p>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="input-label" htmlFor="invite-input">
                ENLACE DE INVITACIÓN *
              </label>
              <input
                id="invite-input"
                className="discord-input"
                type="text"
                value={inviteUrl}
                onChange={(e) => setInviteUrl(e.target.value)}
                placeholder="https://discordia.gg/h7K9xQ2 o h7K9xQ2"
              />
              <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                Las invitaciones tienen un aspecto como: <code>h7K9xQ2</code> o{' '}
                <code>https://discordia.gg/indie-devs</code>
              </span>
            </div>

            {/* Vista previa del servidor detectado */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                VISTA PREVIA DEL SERVIDOR
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={previewServer.iconUrl || previewServer.icon}
                  alt={previewServer.name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'cover',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--header-primary)', fontSize: 15 }}>
                      {previewServer.name}
                    </span>
                    <span className="badge badge-brand" style={{ fontSize: 10 }}>Comunidad</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {previewServer.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 11 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-positive)' }}>
                      <span className="status-dot online" style={{ width: 8, height: 8 }} />
                      5 En línea
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                      <span className="status-dot offline" style={{ width: 8, height: 8 }} />
                      {previewServer.members.length || 12} Miembros totales
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-link" onClick={onClose}>
              Atrás
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!inviteUrl.trim()}
            >
              Unirse al Servidor
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
};

/* ==========================================================================
   4. INVITE MODAL (Generador de invitaciones con selectores de caducidad y usos)
   ========================================================================== */

export interface InviteModalProps {
  server?: Server;
  isOpen?: boolean;
  onClose: () => void;
}

const EXPIRATION_OPTIONS = [
  { label: '30 minutos', value: '30m' },
  { label: '1 hora', value: '1h' },
  { label: '6 horas', value: '6h' },
  { label: '12 horas', value: '12h' },
  { label: '1 día', value: '1d' },
  { label: '7 días', value: '7d' },
  { label: 'Nunca', value: 'never' },
];

const MAX_USES_OPTIONS = [
  { label: 'Sin límite', value: '0' },
  { label: '1 uso', value: '1' },
  { label: '5 usos', value: '5' },
  { label: '10 usos', value: '10' },
  { label: '25 usos', value: '25' },
  { label: '50 usos', value: '50' },
  { label: '100 usos', value: '100' },
];

/**
 * Diálogo para compartir enlace de invitación al servidor con configuración granular.
 */
export const InviteModal: React.FC<InviteModalProps> = ({
  server = SERVERS[0],
  isOpen = true,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [expiration, setExpiration] = useState('7d');
  const [maxUses, setMaxUses] = useState('0');
  const [invitedFriends, setInvitedFriends] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const inviteLink = `https://discordia.gg/invite/${server.id}-${expiration}-${maxUses}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendDirectInvite = (friendId: string) => {
    setInvitedFriends((prev) => ({ ...prev, [friendId]: true }));
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={480}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={onClose}
          className="btn-icon"
          aria-label="Cerrar modal"
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title" style={{ fontSize: 20 }}>
            Invitar amigos a {server.name}
          </h2>
          <p className="modal-subtitle">
            Canal predeterminado de bienvenida: <strong style={{ color: 'var(--header-primary)' }}>#general</strong>
          </p>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Enlace generado con botón de copiar */}
          <div>
            <label className="input-label" htmlFor="generated-invite-input">
              O ENVÍA UN ENLACE DE INVITACIÓN AL SERVIDOR
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="generated-invite-input"
                className="discord-input"
                type="text"
                readOnly
                value={inviteLink}
                style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'text' }}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn"
                style={{
                  backgroundColor: copied ? 'var(--status-online)' : 'var(--brand)',
                  color: 'white',
                  minWidth: 100,
                  transition: 'all 0.2s',
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copiar
                  </>
                )}
              </button>
            </div>
            <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              {expiration === 'never'
                ? 'Tu enlace de invitación no caducará nunca.'
                : `Tu enlace caduca en ${EXPIRATION_OPTIONS.find((o) => o.value === expiration)?.label}.`}
            </span>
          </div>

          {/* Selectores de expiración y límites */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label" htmlFor="expiration-select">EXPIRAR DESPUÉS DE</label>
              <select
                id="expiration-select"
                className="discord-input"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {EXPIRATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label" htmlFor="max-uses-select">NÚMERO MÁXIMO DE USOS</label>
              <select
                id="max-uses-select"
                className="discord-input"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {MAX_USES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista rápida de amigos para invitar directamente */}
          <div>
            <div className="input-label">AMIGOS CONECTADOS RECIENTEMENTE</div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                maxHeight: 140,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {Object.values(USERS).slice(1, 5).map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={user.avatarUrl || user.avatar}
                      alt={user.displayName}
                      style={{ width: 30, height: 30, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
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
                    onClick={() => handleSendDirectInvite(user.id)}
                    className="btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      backgroundColor: invitedFriends[user.id] ? 'var(--bg-modifier-selected)' : 'var(--brand)',
                      color: invitedFriends[user.id] ? 'var(--text-positive)' : 'white',
                    }}
                    disabled={invitedFriends[user.id]}
                  >
                    {invitedFriends[user.id] ? 'Enviado' : 'Invitar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};

/* ==========================================================================
   5. USER PROFILE MODAL (Perfil público con tabs, badges y moderación)
   ========================================================================== */

export interface UserProfileModalProps {
  user?: User & { isSuspended?: boolean };
  currentUser?: User;
  roles?: Role[];
  isOpen?: boolean;
  onClose: () => void;
  onSendDM?: (userId: string) => void;
  onEditProfile?: () => void;
  onReportUser?: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
}

/**
 * Modal interactivo con banner, badges de Nitro/Booster, tabs About Me y Servidores en común.
 */
export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user = USERS['u1'],
  currentUser = USERS[CURRENT_USER_ID],
  roles = SERVERS[0].roles,
  isOpen = true,
  onClose,
  onSendDM,
  onEditProfile,
  onReportUser,
  onBlockUser,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'servers'>('about');
  const [isBlocked, setIsBlocked] = useState(false);
  const [personalNote, setPersonalNote] = useState('');

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentUser?.id;
  const isSuspended = !!user.isSuspended;

  // Servidores compartidos simulados
  const mutualServers = SERVERS.filter((s) =>
    s.members.some((m) => m.id === user.id)
  );

  // Status color mapping
  const statusColors: Record<string, string> = {
    online: 'var(--status-online)',
    idle: 'var(--status-idle)',
    dnd: 'var(--status-dnd)',
    offline: 'var(--status-offline)',
    invisible: 'var(--status-offline)',
  };

  const currentStatusColor = statusColors[user.status] || 'var(--status-offline)';

  // Roles del usuario
  const userRoles = roles.filter((r) => user.roleIds?.includes(r.id));

  const handleBlockToggle = () => {
    setIsBlocked((prev) => !prev);
    onBlockUser?.(user.id);
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={520}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Botón de cierre */}
        <button
          onClick={onClose}
          className="btn-icon"
          aria-label="Cerrar perfil"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
          }}
        >
          <X size={18} />
        </button>

        {/* Banner de cabecera */}
        <div
          style={{
            height: 120,
            width: '100%',
            backgroundColor: user.bannerColor || 'var(--brand)',
            backgroundImage: user.banner ? `url(${user.banner})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        />

        {/* Contenedor del Avatar y Badges */}
        <div style={{ padding: '0 20px', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: -42,
              marginBottom: 12,
            }}
          >
            {/* Avatar con anillo de presencia */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--radius-full)',
                  border: '6px solid var(--bg-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <img
                  src={user.avatarUrl || user.avatar}
                  alt={user.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              {/* Anillo/punto de presencia */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  width: 18,
                  height: 18,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: currentStatusColor,
                  border: '3px solid var(--bg-primary)',
                }}
                title={`Estado: ${user.status}`}
              />
            </div>

            {/* Badges de usuario */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                backgroundColor: 'var(--bg-secondary)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {user.isPremium && (
                <div title="Suscriptor Nitro" style={{ color: '#ff73fa', display: 'flex', alignItems: 'center' }}>
                  <Sparkles size={18} />
                </div>
              )}
              {user.badges?.includes('Server Booster') && (
                <div title="Server Booster" style={{ color: '#f47fff', display: 'flex', alignItems: 'center' }}>
                  <Zap size={18} />
                </div>
              )}
              {user.isStaff && (
                <div title="Staff Oficial de Discordia" style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center' }}>
                  <ShieldAlert size={18} />
                </div>
              )}
              {user.badges?.map((badge, idx) => (
                <span
                  key={idx}
                  className="badge badge-brand"
                  style={{ fontSize: 10, padding: '2px 6px' }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Aviso de cuenta suspendida */}
          {isSuspended && (
            <div
              style={{
                backgroundColor: 'rgba(218, 55, 60, 0.15)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--text-danger)',
              }}
            >
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                <strong>Cuenta Suspendida:</strong> Este usuario ha sido inhabilitado temporalmente por infringir los Términos de Servicio de Discordia.
              </div>
            </div>
          )}

          {/* Nombre, username y bio */}
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--header-primary)' }}>
              {user.displayName}
            </h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>@{user.username}</span>
              {user.discriminator && <span>#{user.discriminator}</span>}
            </div>
            {user.customStatus && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: 'var(--interactive-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>💬</span>
                <span>{user.customStatus}</span>
              </div>
            )}
          </div>

          {/* Acciones principales */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {isSelf ? (
              <button
                type="button"
                onClick={onEditProfile}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Editar Perfil
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSendDM?.(user.id)}
                  disabled={isSuspended || isBlocked}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <MessageSquare size={16} /> Enviar Mensaje
                </button>
                <button
                  type="button"
                  onClick={handleBlockToggle}
                  className={`btn ${isBlocked ? 'btn-danger' : 'btn-secondary'}`}
                  title={isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                >
                  <UserX size={16} /> {isBlocked ? 'Bloqueado' : 'Bloquear'}
                </button>
                <button
                  type="button"
                  onClick={() => onReportUser?.(user.id)}
                  className="btn btn-secondary"
                  title="Reportar usuario a moderación"
                >
                  <Flag size={16} />
                </button>
              </>
            )}
          </div>

          {/* Pestañas de navegación */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 14,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'about' ? '2px solid var(--brand)' : '2px solid transparent',
                color: activeTab === 'about' ? 'var(--header-primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Sobre mí
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('servers')}
              style={{
                padding: '8px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'servers' ? '2px solid var(--brand)' : '2px solid transparent',
                color: activeTab === 'servers' ? 'var(--header-primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Servidores en común
              <span
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 11,
                }}
              >
                {mutualServers.length}
              </span>
            </button>
          </div>

          {/* Contenido de la pestaña activa */}
          <div style={{ paddingBottom: 20 }}>
            {activeTab === 'about' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Bio */}
                <div>
                  <div className="input-label">SOBRE MÍ</div>
                  <p style={{ fontSize: 13, color: 'var(--text-normal)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {user.bio || 'Este usuario aún no ha escrito una biografía.'}
                  </p>
                </div>

                {/* Fecha de registro */}
                <div>
                  <div className="input-label">MIEMBRO DE DISCORDIA DESDE</div>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Noviembre 2021'}
                  </span>
                </div>

                {/* Roles */}
                {userRoles.length > 0 && (
                  <div>
                    <div className="input-label">ROLES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {userRoles.map((role) => (
                        <div
                          key={role.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 8px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 12,
                            color: 'var(--header-primary)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: role.color,
                            }}
                          />
                          <span>{role.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nota privada para este usuario */}
                {!isSelf && (
                  <div>
                    <div className="input-label">NOTA PRIVADA</div>
                    <textarea
                      className="discord-input"
                      rows={2}
                      placeholder="Haz clic para añadir una nota que solo tú podrás ver..."
                      value={personalNote}
                      onChange={(e) => setPersonalNote(e.target.value)}
                      style={{ resize: 'none', fontSize: 12 }}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Pestaña Servidores en común */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {mutualServers.length > 0 ? (
                  mutualServers.map((server) => (
                    <div
                      key={server.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={server.iconUrl || server.icon}
                          alt={server.name}
                          style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--header-primary)' }}>
                            {server.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {server.members.length} miembros
                          </div>
                        </div>
                      </div>
                      {server.boostLevel > 0 && (
                        <span className="badge badge-boost" style={{ fontSize: 10 }}>
                          Nivel {server.boostLevel}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 13 }}>
                    No compartes servidores con este usuario.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
};

/* ==========================================================================
   6. INCOMING CALL MODAL (Diálogo flotante inferior derecho con llamada)
   ========================================================================== */

export interface IncomingCallModalProps {
  caller?: User;
  channelName?: string;
  isOpen?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Diálogo flotante inferior derecho animado para llamadas de voz/vídeo entrantes.
 */
export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller = USERS['u1'],
  channelName = 'Llamada Directa',
  isOpen = true,
  onAccept,
  onDecline,
}) => {
  if (!isOpen || !caller) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1200,
        width: 320,
        backgroundColor: 'var(--bg-floating)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-floating)',
        padding: '20px',
        animation: 'slideUp 0.25s ease',
        color: 'var(--text-normal)',
      }}
      role="alertdialog"
      aria-labelledby="incoming-call-title"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        {/* Avatar del llamante con pulso animado */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--status-online)',
              animation: 'pulse 1.8s infinite ease-in-out',
            }}
          />
          <img
            src={caller.avatarUrl || caller.avatar}
            alt={caller.displayName}
            style={{
              width: 68,
              height: 68,
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
              border: '3px solid var(--bg-floating)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: 'var(--status-online)',
              borderRadius: 'var(--radius-full)',
              padding: 4,
              border: '2px solid var(--bg-floating)',
              color: 'white',
              display: 'flex',
            }}
          >
            <Radio size={12} />
          </div>
        </div>

        {/* Nombre y subtítulo */}
        <h4 id="incoming-call-title" style={{ fontSize: 17, fontWeight: 700, color: 'var(--header-primary)', margin: 0 }}>
          {caller.displayName}
        </h4>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          te está llamando... ({channelName})
        </span>

        {/* Botones redondos de respuesta */}
        <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
          {/* Rechazar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={onDecline}
              aria-label="Rechazar llamada"
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--danger)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(218, 55, 60, 0.4)',
                transition: 'transform 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <PhoneOff size={24} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rechazar</span>
          </div>

          {/* Aceptar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={onAccept}
              aria-label="Aceptar llamada"
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--status-online)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(35, 165, 90, 0.4)',
                transition: 'transform 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Phone size={24} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aceptar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   7. CONFIRM DIALOG (Modal de confirmación para acciones destructivas)
   ========================================================================== */

export interface ConfirmDialogProps {
  action?: ConfirmAction;
  targetName?: string;
  targetDetail?: string;
  isOpen?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación para acciones críticas. Para 'delete-server' requiere
 * escribir el nombre exacto del servidor.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  action = 'delete-server',
  targetName = 'Indie Developers',
  targetDetail,
  isOpen = true,
  onConfirm,
  onCancel,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  if (!isOpen || !action) return null;

  const isDeleteServer = action === 'delete-server';
  const isMatch = isDeleteServer
    ? confirmationInput.trim().toLowerCase() === targetName.trim().toLowerCase()
    : true;

  // Metadata por tipo de acción
  const actionConfigs: Record<
    NonNullable<ConfirmAction>,
    { title: string; desc: string; confirmBtn: string; icon: React.ReactNode; isDanger: boolean }
  > = {
    'delete-server': {
      title: `Eliminar servidor '${targetName}'`,
      desc: `¿Estás completamente seguro de que deseas eliminar ${targetName}? Esta acción es irreversible y eliminará todos los canales, mensajes y roles para siempre.`,
      confirmBtn: 'Eliminar Servidor',
      icon: <Trash2 size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'leave-server': {
      title: `Abandonar '${targetName}'`,
      desc: `¿Estás seguro de que deseas abandonar ${targetName}? No podrás volver a unirte a menos que te vuelvan a invitar.`,
      confirmBtn: 'Abandonar Servidor',
      icon: <LogOut size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'ban-member': {
      title: `Banear a @${targetName}`,
      desc: `¿Estás seguro de que deseas banear a @${targetName}? Se eliminarán sus mensajes recientes y no podrá reingresar al servidor.`,
      confirmBtn: 'Banear Miembro',
      icon: <UserX size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'kick-member': {
      title: `Expulsar a @${targetName}`,
      desc: `¿Estás seguro de que deseas expulsar a @${targetName} del servidor? Podrá volver si tiene una invitación válida.`,
      confirmBtn: 'Expulsar',
      icon: <LogOut size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'delete-channel': {
      title: `Eliminar canal #${targetName}`,
      desc: `¿Estás seguro de que quieres eliminar #${targetName}? Todos los mensajes dentro de este canal se perderán de manera permanente.`,
      confirmBtn: 'Eliminar Canal',
      icon: <Trash2 size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'transfer-ownership': {
      title: `Transferir propiedad a @${targetName}`,
      desc: `Vas a ceder el control total del servidor a @${targetName}. Perderás los privilegios de propietario supremo.`,
      confirmBtn: 'Transferir Propiedad',
      icon: <AlertTriangle size={24} color="var(--text-warning)" />,
      isDanger: true,
    },
  };

  const config = actionConfigs[action] || actionConfigs['delete-server'];

  return (
    <ModalOverlay onClose={onCancel} maxWidth={440}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={onCancel}
          className="btn-icon"
          aria-label="Cerrar confirmación"
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {config.icon}
            <h2 className="modal-title" style={{ fontSize: 19, margin: 0 }}>
              {config.title}
            </h2>
          </div>
          <p className="modal-subtitle" style={{ lineHeight: 1.5 }}>
            {config.desc}
          </p>
          {targetDetail && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Detalle: {targetDetail}
            </div>
          )}
        </div>

        {isDeleteServer && (
          <div className="modal-body" style={{ paddingTop: 0 }}>
            <label className="input-label" htmlFor="server-delete-confirm-input">
              INTRODUCE EL NOMBRE DEL SERVIDOR PARA CONFIRMAR:
            </label>
            <div
              style={{
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-xs)',
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--header-primary)',
                letterSpacing: '0.02em',
              }}
            >
              {targetName}
            </div>
            <input
              id="server-delete-confirm-input"
              className="discord-input"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Escribe el nombre aquí..."
              autoFocus
            />
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`btn ${config.isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={!isMatch}
          >
            {config.confirmBtn}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};

/* ==========================================================================
   8. NOTIFICATION CENTER (Bandeja de notificaciones con pestañas y badges)
   ========================================================================== */

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

/* ==========================================================================
   9. GLOBAL SEARCH (Buscador flotante Spotlight con atajos e indexación)
   ========================================================================== */

export interface SearchResultItem {
  id: string;
  type: 'message' | 'channel' | 'user';
  title: string;
  subtitle: string;
  detail?: string;
  timestamp?: string;
  author?: User;
  channelName?: string;
  serverName?: string;
  highlight?: string;
}

export interface GlobalSearchProps {
  isOpen?: boolean;
  onClose: () => void;
  onSelectResult?: (result: SearchResultItem) => void;
  servers?: Server[];
}

/**
 * Buscador global estilo Spotlight con navegación por teclado, filtros y resultados en vivo.
 */
export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen = true,
  onClose,
  onSelectResult,
  servers = [],
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'messages' | 'channels' | 'users'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const searchResults: SearchResultItem[] = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const q = query.toLowerCase();
    const results: SearchResultItem[] = [];

    // Buscar en Canales
    if (filterType === 'all' || filterType === 'channels') {
      servers.forEach((server) => {
        server.categories.forEach((cat) => {
          cat.channels.forEach((ch) => {
            if (ch.name.toLowerCase().includes(q) || (ch.topic && ch.topic.toLowerCase().includes(q))) {
              results.push({
                id: `channel-${ch.id}`,
                type: 'channel',
                title: `#${ch.name}`,
                subtitle: `${server.name} • ${cat.name}`,
                detail: ch.topic,
                serverName: server.name,
                channelName: ch.name,
              });
            }
          });
        });
      });
    }

    // La búsqueda de Mensajes y Usuarios a nivel global requeriría endpoints del backend
    // que actualmente no existen (Elasticsearch, etc.). 
    // Por ahora, el buscador solo filtra canales.

    return results;
  }, [query, filterType]);

  // Atajos de teclado para navegación y selección
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = searchResults[selectedIndex];
        if (selected) {
          onSelectResult?.(selected);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchResults, selectedIndex, onClose, onSelectResult]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={onClose} maxWidth={640}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {/* Barra de Búsqueda Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Search size={22} style={{ color: 'var(--interactive-normal)' }} />
          <input
            ref={inputRef}
            type="text"
            className="discord-input"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: 16,
              padding: 0,
              boxShadow: 'none',
            }}
            placeholder="¿A dónde te gustaría ir? (escribe para buscar mensajes, canales o amigos)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              backgroundColor: 'var(--bg-tertiary)',
              padding: '2px 6px',
              borderRadius: 4,
              color: 'var(--text-muted)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Filtros rápidos */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '8px 20px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {[
            { id: 'all', label: 'Todo' },
            { id: 'messages', label: 'Mensajes' },
            { id: 'channels', label: 'Canales' },
            { id: 'users', label: 'Usuarios' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setFilterType(filter.id as typeof filterType);
                setSelectedIndex(0);
              }}
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterType === filter.id ? 'var(--brand)' : 'transparent',
                color: filterType === filter.id ? 'white' : 'var(--interactive-normal)',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Resultados */}
        <div
          style={{
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 380,
          }}
        >
          {searchResults.length > 0 ? (
            searchResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectResult?.(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--bg-modifier-selected)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    {/* Icono según tipo */}
                    {item.type === 'message' && item.author ? (
                      <img
                        src={item.author.avatarUrl || item.author.avatar}
                        alt={item.author.displayName}
                        style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                    ) : item.type === 'channel' ? (
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--interactive-normal)',
                        }}
                      >
                        <Hash size={18} />
                      </div>
                    ) : item.author ? (
                      <img
                        src={item.author.avatarUrl || item.author.avatar}
                        alt={item.author.displayName}
                        style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--brand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                        }}
                      >
                        <Compass size={18} />
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--header-primary)' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {item.subtitle}
                        </span>
                      </div>
                      {item.detail && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-normal)',
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.detail}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.timestamp && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, flexShrink: 0 }}>
                      {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
              No se encontraron resultados para "{query}".
            </div>
          )}
        </div>

        {/* Footer con atajos */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--bg-tertiary)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navegar</span>
            <span><kbd>ENTER</kbd> Seleccionar</span>
            <span><kbd>ESC</kbd> Cerrar</span>
          </div>
          <span>Búsqueda rápida en Discordia</span>
        </div>
      </div>
    </ModalOverlay>
  );
};
