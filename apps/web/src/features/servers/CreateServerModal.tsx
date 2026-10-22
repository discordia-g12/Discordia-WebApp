import React, { useState,  useRef, } from 'react';
import {
  X, Hash, Compass, Sparkles, ChevronRight, Upload, Zap, Info
} from 'lucide-react';
import { User,    } from '../../types';
// import { createInvite } from '@discordia/core';
import { ModalOverlay } from '../../ui/ModalOverlay';

export interface CreateServerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onCreateServer?: (serverData: { name: string; template: string; icon?: string }) => void;
  currentUser?: User;
  onJoinExisting?: () => void;
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
  '',
  '',
  '',
  '',
];

/**
 * Asistente de 2 pasos para creación de servidores comunitarios y personales.
 */
export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen = true,
  onClose,
  onCreateServer,
  currentUser,
  onJoinExisting,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [serverName, setServerName] = useState(`Servidor de ${currentUser?.displayName || 'Usuario'}`);
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
                  onClick={onJoinExisting || onClose}
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
