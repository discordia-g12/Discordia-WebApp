import { useState, type DragEvent } from 'react';
import { isLocalCategoryId } from '@discordia/core';
import type { Server } from '../../types';

export type DragItem = { kind: 'channel' | 'category'; id: string };
export type DropTarget = { kind: 'channel' | 'category'; id: string; position: 'before' | 'after' };

/**
 * Reorden de canales y categorías por arrastre (drag & drop nativo de HTML5), compartido por la barra
 * de canales del rediseño y la anterior. Traduce dónde se suelta a "antes de qué elemento" va.
 */
export function useChannelDragAndDrop(
  server: Server,
  onMoveChannel?: (channelId: string, targetCategoryId: string, beforeChannelId: string | null) => void,
  onMoveCategory?: (categoryId: string, beforeCategoryId: string | null) => void
) {
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const startDrag = (e: DragEvent, item: DragItem) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id); // requerido por Firefox para iniciar el arrastre
    setDragItem(item);
  };

  const endDrag = () => {
    setDragItem(null);
    setDropTarget(null);
  };

  /** Un canal se puede soltar sobre otro canal o sobre una categoría; una categoría, solo sobre otra real. */
  const canDropOn = (kind: DropTarget['kind'], id: string) => {
    if (!dragItem || dragItem.id === id) return false;
    if (dragItem.kind === 'channel') return true;
    return kind === 'category' && !isLocalCategoryId(id);
  };

  const handleDragOver = (e: DragEvent, kind: DropTarget['kind'], id: string) => {
    if (!canDropOn(kind, id)) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    if (dropTarget?.kind !== kind || dropTarget.id !== id || dropTarget.position !== position) {
      setDropTarget({ kind, id, position });
    }
  };

  /** Traduce el destino del arrastre a "antes de qué elemento" va lo arrastrado. */
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItem && dropTarget) {
      if (dragItem.kind === 'channel') {
        if (dropTarget.kind === 'category') {
          // Sobre el encabezado: al principio de esa categoría
          const target = server.categories.find((c) => c.id === dropTarget.id);
          const first = target?.channels.find((ch) => ch.id !== dragItem.id);
          onMoveChannel?.(dragItem.id, dropTarget.id, first?.id ?? null);
        } else {
          const target = server.categories.find((c) => c.channels.some((ch) => ch.id === dropTarget.id));
          if (target) {
            const siblings = target.channels.filter((ch) => ch.id !== dragItem.id);
            const index = siblings.findIndex((ch) => ch.id === dropTarget.id);
            const before = dropTarget.position === 'before' ? siblings[index] : siblings[index + 1];
            onMoveChannel?.(dragItem.id, target.id, before?.id ?? null);
          }
        }
      } else {
        const siblings = server.categories.filter((c) => !isLocalCategoryId(c.id) && c.id !== dragItem.id);
        const index = siblings.findIndex((c) => c.id === dropTarget.id);
        const before = dropTarget.position === 'before' ? siblings[index] : siblings[index + 1];
        onMoveCategory?.(dragItem.id, before?.id ?? null);
      }
    }
    endDrag();
  };

  return { dragItem, dropTarget, startDrag, endDrag, handleDragOver, handleDrop };
}
