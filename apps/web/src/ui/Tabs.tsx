import { useId, useRef, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { transitions } from './motion';
import styles from './Tabs.module.css';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Contador entre paréntesis: "DISPONIBLE (0)". */
  count?: number;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nombre accesible del grupo. */
  label?: string;
}

/**
 * Pestañas con subrayado que se desliza a la activa. Navegables con flechas, Inicio y Fin (patrón de
 * tabs de WAI-ARIA, con activación al moverse).
 */
export function Tabs<T extends string>({ items, value, onChange, label }: TabsProps<T>) {
  const underlineId = useId();
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items.filter((i) => !i.disabled);

  const move = (event: KeyboardEvent, current: T) => {
    const index = enabled.findIndex((i) => i.value === current);
    const target =
      event.key === 'ArrowRight' ? enabled[(index + 1) % enabled.length]
      : event.key === 'ArrowLeft' ? enabled[(index - 1 + enabled.length) % enabled.length]
      : event.key === 'Home' ? enabled[0]
      : event.key === 'End' ? enabled[enabled.length - 1]
      : null;
    if (!target) return;
    event.preventDefault();
    onChange(target.value);
    refs.current[items.indexOf(target)]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={styles.list}>
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            className={`${styles.tab} ${selected ? styles.selected : ''}`}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => move(e, item.value)}
          >
            {item.label}
            {item.count !== undefined && ` (${item.count})`}
            {selected && (
              <motion.span
                layoutId={underlineId}
                className={styles.underline}
                transition={reduce ? { duration: 0 } : transitions.fast}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
