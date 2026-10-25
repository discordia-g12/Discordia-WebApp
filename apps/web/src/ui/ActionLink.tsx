import type { ButtonHTMLAttributes } from 'react';
import styles from './ActionLink.module.css';

interface ActionLinkProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> {
  /** Texto sin el guion bajo: "editar" se muestra como "_editar". */
  children: string;
  onPress?: () => void;
}

/** Acción secundaria en texto chico con guion bajo inicial (_editar, _mostrar, _reintentar). */
export function ActionLink({ children, onPress, className, type = 'button', ...rest }: ActionLinkProps) {
  return (
    <button type={type} className={`${styles.link} ${className ?? ''}`} onClick={onPress} {...rest}>
      _{children}
    </button>
  );
}
