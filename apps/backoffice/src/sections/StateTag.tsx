import { ACCOUNT_STATE_LABEL, type AccountState } from './types';
import styles from './sections.module.css';

/** Estado de una cuenta o un servidor: etiqueta con borde; suspendido, en bloque invertido. */
export function StateTag({ state }: { state: AccountState }) {
  return <span className={`${styles.tag} ${state === 'suspended' ? styles.tagSuspended : ''}`}>{ACCOUNT_STATE_LABEL[state]}</span>;
}
