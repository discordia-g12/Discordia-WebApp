import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './UnderlineInput.module.css';

interface UnderlineInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: string;
  required?: boolean;
  /** Ayuda bajo el campo (texto chico). */
  hint?: string;
  /** Error de validación: reemplaza a la ayuda y marca el campo como inválido. */
  error?: string;
  /** Contraseña: oculta el texto y suma un ojo para mostrarlo / ocultarlo. */
  secret?: boolean;
  /** large: formularios que son toda la pantalla (acceso), con letra y alto mayores. */
  size?: 'default' | 'large';
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
}

/**
 * Campo de formulario del rediseño: etiqueta en negrita, el texto entre dos líneas finas y la ayuda o
 * el error abajo, con barra inicial.
 */
export const UnderlineInput = forwardRef<HTMLInputElement, UnderlineInputProps>(function UnderlineInput(
  { label, required = false, hint, error, secret = false, size = 'default', type = 'text', id, className, ...inputProps },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const [revealed, setRevealed] = useState(false);
  const message = error ?? hint;
  const EyeIcon = revealed ? EyeOff : Eye;

  return (
    <div className={`${styles.root} ${size === 'large' ? styles.large : ''} ${className ?? ''}`}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className={styles.field}>
        <input
          ref={ref}
          id={inputId}
          type={secret && !revealed ? 'password' : secret ? 'text' : type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={`${styles.input} ${secret ? styles.withToggle : ''} ${error ? styles.invalid : ''}`}
          {...inputProps}
        />
        {secret && (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setRevealed((v) => !v)}
            aria-controls={inputId}
            aria-pressed={revealed}
            aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            disabled={inputProps.disabled}
          >
            <EyeIcon size={size === 'large' ? 20 : 16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
      {message && (
        <span id={messageId} className={`${styles.message} ${error ? styles.error : ''}`}>
          / {message}
        </span>
      )}
    </div>
  );
});
