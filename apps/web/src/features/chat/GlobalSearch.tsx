import { User, Server } from "../../types";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
Search, Hash, Compass} from 'lucide-react';
// import { createInvite } from '@discordia/core';
import { ModalOverlay } from '../../ui/ModalOverlay';
import styles from './GlobalSearch.module.css';

export interface SearchResultItem {
  id: string;
  type: 'message' | 'channel' | 'user';
  title: string;
  subtitle: string;
  detail?: string;
  timestamp?: string;
  author?: User;
  channelName?: string;
  serverName?: string;
  highlight?: string;
}

export interface GlobalSearchProps {
  isOpen?: boolean;
  onClose: () => void;
  onSelectResult?: (result: SearchResultItem) => void;
  servers?: Server[];
}

/**
 * Buscador global estilo Spotlight con navegación por teclado, filtros y resultados en vivo.
 */
export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen = true,
  onClose,
  onSelectResult,
  servers = [],
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'messages' | 'channels' | 'users'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const searchResults: SearchResultItem[] = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const q = query.toLowerCase();
    const results: SearchResultItem[] = [];

    // Buscar en Canales
    if (filterType === 'all' || filterType === 'channels') {
      servers.forEach((server) => {
        server.categories.forEach((cat) => {
          cat.channels.forEach((ch: any) => {
            if (ch.name.toLowerCase().includes(q) || (ch.topic && ch.topic.toLowerCase().includes(q))) {
              results.push({
                id: `channel-${ch.id}`,
                type: 'channel',
                title: `#${ch.name}`,
                subtitle: `${server.name} • ${cat.name}`,
                detail: ch.topic,
                serverName: server.name,
                channelName: ch.name,
              });
            }
          });
        });
      });
    }

    // La búsqueda de Mensajes y Usuarios a nivel global requeriría endpoints del backend
    // que actualmente no existen (Elasticsearch, etc.). 
    // Por ahora, el buscador solo filtra canales.

    return results;
  }, [query, filterType]);

  // Atajos de teclado para navegación y selección
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = searchResults[selectedIndex];
        if (selected) {
          onSelectResult?.(selected);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchResults, selectedIndex, onClose, onSelectResult]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={onClose} maxWidth={640}>
      <div className={styles.div}>
        {/* Barra de Búsqueda Input */}
        <div className={styles.barraBusquedaInput}>
          <Search size={22} style={{ color: 'var(--interactive-normal)' }} />
          <input
            ref={inputRef}
            type="text"
            className="discord-input"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: 16,
              padding: 0,
              boxShadow: 'none',
            }}
            placeholder="¿A dónde te gustaría ir? (escribe para buscar mensajes, canales o amigos)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className={styles.esc}>
            ESC
          </kbd>
        </div>

        {/* Filtros rápidos */}
        <div className={styles.filtrosRapidos}>
          {[
            { id: 'all', label: 'Todo' },
            { id: 'messages', label: 'Mensajes' },
            { id: 'channels', label: 'Canales' },
            { id: 'users', label: 'Usuarios' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setFilterType(filter.id as typeof filterType);
                setSelectedIndex(0);
              }}
              className={styles.filtrosRapidosButton} style={{ backgroundColor: filterType === filter.id ? 'var(--brand)' : 'transparent', color: filterType === filter.id ? 'white' : 'var(--interactive-normal)' }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Resultados */}
        <div className={styles.resultados}>
          {searchResults.length > 0 ? (
            searchResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectResult?.(item);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={styles.resultadosDiv} style={{ backgroundColor: isSelected ? 'var(--bg-modifier-selected)' : 'transparent' }}
                >
                  <div className={styles.resultadosDivDiv}>
                    {/* Icono según tipo */}
                    {item.type === 'message' && item.author ? (
                      <img
                        src={item.author.avatarUrl || item.author.avatar}
                        alt={item.author.displayName}
                        className={styles.resultadosDivDivImg}
                      />
                    ) : item.type === 'channel' ? (
                      <div className={styles.resultadosDivDivDiv}>
                        <Hash size={18} />
                      </div>
                    ) : item.author ? (
                      <img
                        src={item.author.avatarUrl || item.author.avatar}
                        alt={item.author.displayName}
                        className={styles.resultadosDivDivImg}
                      />
                    ) : (
                      <div className={styles.resultadosDivDivDiv2}>
                        <Compass size={18} />
                      </div>
                    )}

                    <div className={styles.resultadosDivDivDiv3}>
                      <div className={styles.resultadosDivDivDiv3Div}>
                        <span className={styles.resultadosDivDivDiv3DivSpan}>
                          {item.title}
                        </span>
                        <span className={styles.resultadosDivDivDiv3DivSpan2}>
                          {item.subtitle}
                        </span>
                      </div>
                      {item.detail && (
                        <div className={styles.resultadosDivDivDiv3Div2}>
                          {item.detail}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.timestamp && (
                    <span className={styles.resultadosDivSpan}>
                      {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className={styles.resultadosDiv2}>
              No se encontraron resultados para "{query}".
            </div>
          )}
        </div>

        {/* Footer con atajos */}
        <div className={styles.footerAtajos}>
          <div className={styles.footerAtajosDiv}>
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navegar</span>
            <span><kbd>ENTER</kbd> Seleccionar</span>
            <span><kbd>ESC</kbd> Cerrar</span>
          </div>
          <span>Búsqueda rápida en Discordia</span>
        </div>
      </div>
    </ModalOverlay>
  );
};
