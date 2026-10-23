import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Smile } from 'lucide-react';
import { Status } from '../../../types';
import styles from './LegacyStatusPicker.module.css';

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
export const LegacyStatusPicker: React.FC<StatusPickerProps> = ({
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
      className={styles.selectorEstado} style={{ bottom: position.bottom !== undefined ? `${position.bottom}px` : undefined, left: position.left !== undefined ? `${position.left}px` : undefined, top: position.top !== undefined ? `${position.top}px` : undefined, right: position.right !== undefined ? `${position.right}px` : undefined }}
    >
      {/* Encabezado con estado personalizado */}
      <div className={styles.encabezadoEstadoPersonalizado}>
        <label
          htmlFor="custom-status-input"
          className={styles.encabezadoEstadoPersonalizadoLabel}
        >
          <span>Estado Personalizado</span>
          <span
            className={styles.encabezadoEstadoPersonalizadoLabelSpan} style={{ color:
                customText.length >= 60
                  ? 'var(--text-danger, #fa777c)'
                  : 'var(--text-muted, #949ba4)' }}
          >
            {customText.length}/64
          </span>
        </label>

        <form onSubmit={handleSaveCustom} className={styles.encabezadoEstadoPersonalizadoForm}>
          <div className={styles.encabezadoEstadoPersonalizadoFormDiv}>
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
                className={styles.limpiarEstado}
                title="Limpiar estado"
              >
                <X size={14} />
              </button>
            ) : (
              <span className={styles.encabezadoEstadoPersonalizadoFormDivSpan}>
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
        <div className={styles.emojisSugeridos}>
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
      <div className={styles.separador} />

      {/* Lista de estados de presencia */}
      <div className={styles.listaEstadosPresencia}>
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
                className={styles.indicadorCromaticoEstado} style={{ backgroundColor: item.color }}
              />

              <div className={styles.listaEstadosPresenciaDiv}>
                <div
                  className={styles.listaEstadosPresenciaDivDiv} style={{ color: isSelected
                      ? 'var(--text-white, #ffffff)'
                      : 'var(--text-normal, #dbdee1)' }}
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
                  <p className={styles.listaEstadosPresenciaDivP}>
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

export default LegacyStatusPicker;
