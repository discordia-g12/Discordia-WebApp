import { AnimatePresence } from 'motion/react';
import { Toast } from '../ui';
import { useUIStore } from './uiStore';
import styles from './ToastHost.module.css';

/**
 * Avisos del rediseño (docs/TODO-REDISENO.md, sección 3): tira negra al pie, del ancho de la columna
 * central, que entra desde abajo y se va sola (4 s; con una acción, el doble). Los errores llevan el
 * borde rojo y, si hay cómo, _reintentar.
 */
export function ToastHost() {
  const toast = useUIStore((s) => s.toast);
  const dismissToast = useUIStore((s) => s.dismissToast);

  return (
    <div className={styles.host}>
      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            tone={toast.type === 'danger' ? 'error' : 'default'}
            action={
              toast.action && {
                label: toast.action.label,
                onPress: () => {
                  dismissToast();
                  toast.action!.onPress();
                },
              }
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
