import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Smile } from 'lucide-react';
import { Status } from '../types';

/**
 * Propiedades del componente emergente StatusPicker.
 */
export interface StatusPickerProps {
  /** Estado de presencia actual del usuario. */
  currentStatus: Status;
  /** Texto del estado personalizado actual. */
  currentCustomStatus?: string;
  /** Callback al seleccionar un estado de presencia estándar. */
  onSelectStatus: (status: Status) => void;
  /** Callback para guardar el estado personalizado textual. */
  onSaveCustomStatus: (customStatus: string) => void;
  /** Callback para cerrar el selector emergente. */
  onClose: () => void;
  /** Posicionamiento CSS del popover emergente. */
  position?: { bottom?: number; left?: number; top?: number; right?: number };
}

/** Configuración visual y semántica de los estados de presencia estándar. */
const STATUS_OPTIONS: Array<{
  id: Status;
  label: string;
  description?: string;
  color: string;
}> = [
  {
    id: 'online',
    label: 'En línea',
    color: 'var(--status-online, #23a55a)',
  },
  {
    id: 'idle',
    label: 'Ausente',
    color: 'var(--status-idle, #f0b232)',
  },
  {
    id: 'dnd',
    label: 'No molestar',
    description: 'No recibirás notificaciones en el escritorio',
    color: 'var(--status-dnd, #f23f43)',
  },
  {
    id: 'invisible',
    label: 'Invisible',
    description: 'No aparecerás en línea, pero tendrás acceso total',
    color: 'var(--status-offline, #80848e)',
  },
];

/** Emojis sugeridos para estados personalizados rápidos. */
const SUGGESTED_EMOJIS = ['💻', '🎮', '🎧', '☕', '🚀', '📚', '✨', '😴'];

/**
 * Selector emergente de estado de presencia y estado personalizado.
 * Soporta selección de estado estándar, edición de texto con contador (máx 64 car.),
 * sugerencias de emoji, click exterior y atajo Escape.
 */
export const StatusPicker: React.FC<StatusPickerProps> = ({
  currentStatus,
  currentCustomStatus = '',
  onSelectStatus,
  onSaveCustomStatus,
  onClose,
  position = { bottom: 60, left: 12 },
}) => {
  const [customText, setCustomText] = useState(currentCustomStatus);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detección de click exterior y tecla Escape
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  /** Guarda el estado personalizado y notifica al padre. */
  const handleSaveCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveCustomStatus(customText.trim());
  };

  /** Limpia el estado personalizado. */
  const handleClearCustom = () => {
    setCustomText('');
    onSaveCustomStatus('');
  };

  /** Agrega o reemplaza el emoji al inicio del texto. */
  const handleSelectEmoji = (emoji: string) => {
    if (customText.startsWith(emoji)) return;
    const newText = `${emoji} ${customText.replace(/^[^\w\s]+\s*/, '')}`.trim();
    if (newText.length <= 64) {
      setCustomText(newText);
    }
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Selector de estado"
      style={{
        position: 'fixed',
        bottom: position.bottom !== undefined ? `${position.bottom}px` : undefined,
        left: position.left !== undefined ? `${position.left}px` : undefined,
        top: position.top !== undefined ? `${position.top}px` : undefined,
        right: position.right !== undefined ? `${position.right}px` : undefined,
        width: '310px',
        backgroundColor: 'var(--bg-floating, #111214)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-md, 8px)',
        boxShadow: 'var(--shadow-floating, 0 12px 32px rgba(0, 0, 0, 0.65))',
        padding: '12px',
        zIndex: 9999,
        animation: 'slideUp 150ms ease',
        userSelect: 'none',
      }}
    >
      {/* Encabezado con estado personalizado */}
      <div style={{ marginBottom: '12px' }}>
        <label
          htmlFor="custom-status-input"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--header-secondary, #b5bac1)',
            marginBottom: '6px',
            letterSpacing: '0.04em',
          }}
        >
          <span>Estado Personalizado</span>
          <span
            style={{
              color:
                customText.length >= 60
                  ? 'var(--text-danger, #fa777c)'
                  : 'var(--text-muted, #949ba4)',
              fontWeight: 500,
            }}
          >
            {customText.length}/64
          </span>
        </label>

        <form onSubmit={handleSaveCustom} style={{ display: 'flex', gap: '6px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              id="custom-status-input"
              type="text"
              maxLength={64}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="¿Qué estás haciendo?"
              className="discord-input"
              style={{
                fontSize: '13px',
                padding: '7px 28px 7px 10px',
                height: '34px',
              }}
            />
            {customText ? (
              <button
                type="button"
                onClick={handleClearCustom}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #949ba4)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Limpiar estado"
              >
                <X size={14} />
              </button>
            ) : (
              <span
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #949ba4)',
                  pointerEvents: 'none',
                }}
              >
                <Smile size={14} />
              </span>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0 10px', height: '34px', minWidth: '34px' }}
            title="Guardar estado personalizado"
          >
            <Check size={16} />
          </button>
        </form>

        {/* Emojis sugeridos */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            padding: '4px 6px',
            backgroundColor: 'var(--bg-secondary, #2b2d31)',
            borderRadius: 'var(--radius-xs, 3px)',
          }}
        >
          {SUGGESTED_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelectEmoji(emoji)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px',
                transition: 'transform 100ms ease',
              }}
              title={`Agregar ${emoji}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Separador */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          margin: '10px 0',
        }}
      />

      {/* Lista de estados de presencia */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {STATUS_OPTIONS.map((item) => {
          const isSelected = currentStatus === item.id;

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSelectStatus(item.id);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '8px',
                borderRadius: 'var(--radius-xs, 3px)',
                cursor: 'pointer',
                backgroundColor: isSelected
                  ? 'var(--bg-modifier-selected, rgba(255, 255, 255, 0.12))'
                  : 'transparent',
                transition: 'background-color 100ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor =
                    'var(--bg-modifier-hover, rgba(255, 255, 255, 0.06))';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Indicador cromático del estado */}
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  backgroundColor: item.color,
                  marginTop: '4px',
                  flexShrink: 0,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isSelected
                      ? 'var(--text-white, #ffffff)'
                      : 'var(--text-normal, #dbdee1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{item.label}</span>
                  {isSelected && (
                    <Check
                      size={14}
                      color="var(--brand, #5865f2)"
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </div>

                {item.description && (
                  <p
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted, #949ba4)',
                      marginTop: '2px',
                      lineHeight: '1.2',
                    }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusPicker;
