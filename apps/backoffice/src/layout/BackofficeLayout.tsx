import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { DisplayText, Logo, SquareAvatar, transitions } from '@web/ui';
import type { StaffUser } from '../auth/driver';
import { config } from '../config';
import type { Section, SectionId } from '../routes';
import styles from './BackofficeLayout.module.css';

export interface BackofficeLayoutProps {
  user: StaffUser;
  sections: Section[];
  active: SectionId;
  onSelect: (section: SectionId) => void;
  onLogout: () => void;
  /** Celdas de la sección activa. */
  children: ReactNode;
}

/**
 * Página del backoffice con el lenguaje de los ajustes de la web (PDF, pág. 11), pero como página y no
 * como cortina: a la izquierda quién entró, el buscador, el índice de la sección y el menú de palabras
 * gigantes (con SALIR al final); a la derecha, las celdas de la sección en una grilla de líneas finas.
 */
export function BackofficeLayout({ user, sections, active, onSelect, onLogout, children }: BackofficeLayoutProps) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState('');
  const current = sections.find((s) => s.id === active);

  useEffect(() => {
    document.title = current ? `${current.label} · Discordia Backoffice` : 'Discordia Backoffice';
  }, [current]);

  // El buscador filtra el menú por la palabra o por lo que hay adentro de cada sección
  const q = query.trim().toLowerCase();
  const matches = (s: Section) => !q || s.label.toLowerCase().includes(q) || s.items.some((item) => item.toLowerCase().includes(q));
  const visible = sections.filter(matches);

  return (
    <div className={styles.page}>
      <div className={styles.side}>
        <div className={styles.head}>
          <div className={styles.brand}>
            <Logo size={20} />
            <span className={styles.brandName}>backoffice/</span>
          </div>
          <div className={styles.identity}>
            <SquareAvatar user={{ displayName: user.name, username: user.email || user.name, avatar: user.picture }} size={32} />
            <div className={styles.identityText}>
              <p className={styles.identityName}>{user.name}</p>
              <p className={styles.meta}>staff de la plataforma/</p>
            </div>
          </div>
          <label className={styles.search}>
            <span className={styles.srOnly}>Buscar en el backoffice</span>
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

        <nav className={styles.menu} aria-label="Secciones del backoffice">
          {visible.map((section) => (
            <div key={section.id} className={`${styles.menuItem} ${section.id === active ? styles.menuActive : ''}`}>
              <DisplayText active={section.id === active} onPress={() => onSelect(section.id)}>
                {section.label}
              </DisplayText>
            </div>
          ))}
          {!q && (
            <div className={styles.menuItem}>
              <DisplayText onPress={onLogout}>Salir</DisplayText>
            </div>
          )}
          {q && visible.length === 0 && <p className={styles.noResults}>/ nada coincide con "{query.trim()}"</p>}
        </nav>
      </div>

      {/* La sección nueva entra con un fundido; las celdas bajan una tras otra (CSS) */}
      <motion.main
        key={active}
        className={styles.content}
        aria-label={current?.label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? transitions.reduced : transitions.base}
      >
        {children}
      </motion.main>

      <a className={styles.appLink} href={config.appUrl} target="_blank" rel="noopener noreferrer" title="Ir a Discordia">
        <ArrowUpRight size={20} strokeWidth={1.5} aria-hidden="true" />
        <span className={styles.srOnly}>Ir a Discordia (se abre en otra pestaña)</span>
      </a>
    </div>
  );
}
