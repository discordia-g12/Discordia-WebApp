import styles from './Choice.module.css';

interface ChoiceProps<T extends string> {
  /** Nombre accesible del grupo. */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Opciones excluyentes como palabras en una fila: la elegida en bloque negro (tema, estado, vencimiento). */
export function Choice<T extends string>({ label, options, value, onChange }: ChoiceProps<T>) {
  return (
    <div className={styles.choice} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={option.value === value ? styles.active : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
