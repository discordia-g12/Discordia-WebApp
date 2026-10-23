import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { ActionLink } from './ActionLink';
import styles from './UnderlineInput.module.css';

interface UnderlineInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  required?: boolean;
  /** Ayuda bajo el campo (texto chico). */
  hint?: string;
  /** Error de validación: reemplaza a la ayuda y marca el campo como inválido. */
  error?: string;
  /** Contraseña: oculta el texto y suma _mostrar / _ocultar. */
  secret?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
}

/**
 * Campo de formulario del rediseño: etiqueta en negrita, el texto entre dos líneas finas y la ayuda o
 * el error abajo, con barra inicial.
 */
export const UnderlineInput = forwardRef<HTMLInputElement, UnderlineInputProps>(function UnderlineInput(
  { label, required = false, hint, error, secret = false, type = 'text', id, className, ...inputProps },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const [revealed, setRevealed] = useState(false);
  const message = error ?? hint;

  return (
    <div className={`${styles.root} ${className ?? ''}`}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        ref={ref}
        id={inputId}
        type={secret && !revealed ? 'password' : secret ? 'text' : type}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`${styles.input} ${error ? styles.invalid : ''}`}
        {...inputProps}
      />
      {(message || secret) && (
        <div className={styles.footer}>
          {message ? (
            <span id={messageId} className={`${styles.message} ${error ? styles.error : ''}`}>
              / {message}
            </span>
          ) : (
            <span />
          )}
          {secret && (
            <ActionLink onPress={() => setRevealed((v) => !v)} aria-controls={inputId} aria-pressed={revealed}>
              {revealed ? 'ocultar' : 'mostrar'}
            </ActionLink>
          )}
        </div>
      )}
    </div>
  );
});
