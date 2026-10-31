import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { DisplayText, transitions, useMotionPreset } from '../../ui';
import styles from './SettingsScreen.module.css';

// Choice pasó al catálogo (ui/); se reexporta para las pantallas de ajustes
export { Choice } from '../../ui';

export interface SettingsSection<T extends string> {
  id: T;
  /** Palabra del menú gigante ("CUENTA"). */
  label: string;
  /** Lo que hay adentro (índice chico arriba a la izquierda y búsqueda). */
  items: string[];
}

export interface SettingsScreenProps<T extends string> {
  /** Nombre accesible de la pantalla ("Ajustes de usuario"). */
  title: string;
  /** Arriba a la izquierda: quién o qué se está ajustando (avatar y nombre). */
  identity: ReactNode;
  sections: SettingsSection<T>[];
  active: T;
  onSelect: (section: T) => void;
  /** Palabras del menú que son acciones y no secciones ("CERRAR SESIÓN"). */
  actions?: { label: string; onPress: () => void }[];
  onClose: () => void;
  /** Celdas de la sección activa. */
  children: ReactNode;
}

/**
 * Ajustes del rediseño (PDF, pág. 11), compartido por los de usuario y los de servidor: a la izquierda,
 * arriba la identidad, el buscador y el índice de la sección; abajo el menú de palabras gigantes (la
 * activa en el color del texto, con una barra); a la derecha, las celdas de la sección en una grilla
 * de líneas finas. Entra bajando como una cortina y sale subiendo (con AnimatePresence afuera); se
 * cierra con la × o con Escape.
 */
export function SettingsScreen<T extends string>({
  title,
  identity,
  sections,
  active,
  onSelect,
  actions = [],
  onClose,
  children,
}: SettingsScreenProps<T>) {
  const curtain = useMotionPreset('curtain');
  const reduce = useReducedMotion();
  const [query, setQuery] = useState('');
  const current = sections.find((s) => s.id === active);

  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Si hay un modal abierto encima (invitar, confirmar), Escape es para ese modal
      const otherModal = [...document.querySelectorAll('[aria-modal="true"]')].some((el) => el !== screenRef.current);
      if (!otherModal) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // El buscador filtra el menú por la palabra o por lo que hay adentro de cada sección
  const q = query.trim().toLowerCase();
  const matches = (s: SettingsSection<T>) =>
    !q || s.label.toLowerCase().includes(q) || s.items.some((item) => item.toLowerCase().includes(q));

  return (
    <motion.div ref={screenRef} className={styles.screen} role="dialog" aria-modal="true" aria-label={title} {...curtain}>
      <div className={styles.side}>
        <div className={styles.head}>
          <div className={styles.identity}>{identity}</div>
          <label className={styles.search}>
            <span className={styles.srOnly}>Buscar en ajustes</span>
            <input type="search" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {current && (
            <div className={styles.index}>
              <p className={styles.indexTitle}>{current.label} /</p>
              <ul>
                {current.items.map((item) => (
                  <li key={item}>•{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <nav className={styles.menu} aria-label={title}>
          {sections.filter(matches).map((section) => (
            <div key={section.id} className={`${styles.menuItem} ${section.id === active ? styles.menuActive : ''}`}>
              <DisplayText active={section.id === active} onPress={() => onSelect(section.id)}>
                {section.label}
              </DisplayText>
            </div>
          ))}
          {!q &&
            actions.map((action) => (
              <div key={action.label} className={styles.menuItem}>
                <DisplayText onPress={action.onPress}>{action.label}</DisplayText>
              </div>
            ))}
          {q && sections.filter(matches).length === 0 && <p className={styles.noResults}>/ nada coincide con "{query.trim()}"</p>}
        </nav>
      </div>

      {/* La sección nueva entra con un fundido; las celdas bajan una tras otra (CSS). Es una región con
          nombre y no <main>: la cortina es un diálogo y el <main> de la app sigue montado debajo */}
      <motion.section
        key={active}
        className={styles.content}
        aria-label={current?.label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? transitions.reduced : transitions.base}
      >
        {children}
      </motion.section>

      <button type="button" className={styles.close} onClick={onClose} aria-label={`Cerrar ${title.toLowerCase()}`} title="Cerrar (Esc)">
        <X size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </motion.div>
  );
}

/**
 * Celda de la grilla: título con barra final y su contenido. wide ocupa las dos columnas.
 * soon: todavía no se guarda en el backend; se muestra "próximamente" y los controles quedan
 * deshabilitados (un fieldset disabled deshabilita todo lo de adentro), así nada simula guardarse.
 */
export function SettingsCell({
  title,
  wide = false,
  soon = false,
  soonNote,
  children,
}: {
  title: string;
  wide?: boolean;
  soon?: boolean;
  /** Aclaración de la parte deshabilitada, si no es "Todavía no se guarda en el servidor." */
  soonNote?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.cell} ${wide ? styles.wide : ''}`} aria-label={title}>
      <h2 className={styles.cellTitle}>
        {title} /{soon && <span className={styles.soonTag}>próximamente</span>}
      </h2>
      {soon ? (
        <SoonFieldset note={soonNote}>{children}</SoonFieldset>
      ) : (
        <div className={styles.cellBody}>{children}</div>
      )}
    </section>
  );
}

/** Parte de una celda que todavía no se guarda en el backend: deshabilitada, con la aclaración. */
export function SoonFieldset({ children, note = 'Todavía no se guarda en el servidor.' }: { children: ReactNode; note?: string }) {
  return (
    <fieldset className={styles.soon} disabled>
      <legend className={styles.soonNote}>/ {note}</legend>
      {children}
    </fieldset>
  );
}

/** Fila con título en negrita, descripción chica y un control a la derecha (switches, acciones). */
export function SettingsRow({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <p className={styles.rowTitle}>{title}</p>
        {description && <p className={styles.rowDescription}>{description}</p>}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}

/** Interruptor cuadrado: el bloque se corre a la derecha y se invierte al activarse. */
export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.switchKnob} aria-hidden="true" />
    </button>
  );
}

/** Aviso chico con barra final ("guardado/"); role=status para que se lea. */
export function Feedback({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'error' }) {
  return (
    <p className={`${styles.feedback} ${tone === 'error' ? styles.feedbackError : ''}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
