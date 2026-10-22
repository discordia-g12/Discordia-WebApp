import { User, Server } from "../../types";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
Search, Hash, Compass} from 'lucide-react';
// import { createInvite } from '@discordia/core';
import { ModalOverlay } from '../../ui/ModalOverlay';

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        {/* Barra de Búsqueda Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
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
          <kbd
            style={{
              fontSize: 11,
              backgroundColor: 'var(--bg-tertiary)',
              padding: '2px 6px',
              borderRadius: 4,
              color: 'var(--text-muted)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Filtros rápidos */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '8px 20px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
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
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterType === filter.id ? 'var(--brand)' : 'transparent',
                color: filterType === filter.id ? 'white' : 'var(--interactive-normal)',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Resultados */}
        <div
          style={{
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 380,
          }}
        >
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--bg-modifier-selected)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    {/* Icono según tipo */}
                    {item.type === 'message' && item.author ? (
                      <img
                        src={item.author.avatarUrl || item.author.avatar}
                        alt={item.author.displayName}
                        style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                    ) : item.type === 'channel' ? (
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--interactive-normal)',
                        }}
                      >
                        <Hash size={18} />
                      </div>
                    ) : item.author ? (
                      <img
                        src={item.author.avatarUrl || item.author.avatar}
                        alt={item.author.displayName}
                        style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--brand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                        }}
                      >
                        <Compass size={18} />
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--header-primary)' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {item.subtitle}
                        </span>
                      </div>
                      {item.detail && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-normal)',
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.detail}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.timestamp && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, flexShrink: 0 }}>
                      {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
              No se encontraron resultados para "{query}".
            </div>
          )}
        </div>

        {/* Footer con atajos */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--bg-tertiary)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
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
