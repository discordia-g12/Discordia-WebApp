import { describe, it, expect } from 'vitest';
import {
  moveCategory,
  moveChannel,
  shiftCategory,
  shiftChannel,
  toCategoryOrder,
  toChannelOrder,
} from '../channelLayout';
import type { Category, Channel } from '../../types';

function channel(id: string, categoryId?: string): Channel {
  return { id, name: id, type: 'text', categoryId };
}

const GENERAL = 'cat-srv-1-general';

function layout(): Category[] {
  return [
    { id: GENERAL, name: 'GENERAL', channels: [channel('general'), channel('memes')] },
    { id: 'uuid-a', name: 'A', channels: [channel('a1', 'uuid-a'), channel('a2', 'uuid-a')] },
    { id: 'uuid-b', name: 'B', channels: [channel('b1', 'uuid-b')] },
  ];
}

const ids = (categories: Category[]) => categories.map((c) => [c.id, c.channels.map((ch) => ch.id)]);

describe('moveChannel', () => {
  it('reordena dentro de la misma categoría', () => {
    expect(ids(moveChannel(layout(), 'a2', 'uuid-a', 'a1'))[1]).toEqual(['uuid-a', ['a2', 'a1']]);
  });

  it('mueve a otra categoría y actualiza el categoryId del canal', () => {
    const result = moveChannel(layout(), 'general', 'uuid-b', null);
    expect(ids(result)).toEqual([
      [GENERAL, ['memes']],
      ['uuid-a', ['a1', 'a2']],
      ['uuid-b', ['b1', 'general']],
    ]);
    expect(result[2].channels[1].categoryId).toBe('uuid-b');
  });

  it('al mover a la sección general el canal queda sin categoría', () => {
    const result = moveChannel(layout(), 'b1', GENERAL, 'general');
    expect(result[0].channels.map((ch) => ch.id)).toEqual(['b1', 'general', 'memes']);
    expect(result[0].channels[0].categoryId).toBeUndefined();
  });

  it('no cambia nada si el canal o la categoría no existen', () => {
    const categories = layout();
    expect(moveChannel(categories, 'nope', 'uuid-a', null)).toBe(categories);
    expect(moveChannel(categories, 'a1', 'nope', null)).toBe(categories);
  });
});

describe('moveCategory', () => {
  it('reordena las categorías reales y deja la sección general primero', () => {
    expect(moveCategory(layout(), 'uuid-b', 'uuid-a').map((c) => c.id)).toEqual([GENERAL, 'uuid-b', 'uuid-a']);
    expect(moveCategory(layout(), 'uuid-a', null).map((c) => c.id)).toEqual([GENERAL, 'uuid-b', 'uuid-a']);
  });

  it('no mueve la sección general', () => {
    const categories = layout();
    expect(moveCategory(categories, GENERAL, null)).toBe(categories);
  });
});

describe('shiftChannel', () => {
  it('sube y baja dentro de la categoría', () => {
    expect(ids(shiftChannel(layout(), 'a2', -1))[1]).toEqual(['uuid-a', ['a2', 'a1']]);
    expect(ids(shiftChannel(layout(), 'a1', 1))[1]).toEqual(['uuid-a', ['a2', 'a1']]);
  });

  it('en el borde pasa a la categoría vecina', () => {
    expect(ids(shiftChannel(layout(), 'a1', -1)).slice(0, 2)).toEqual([
      [GENERAL, ['general', 'memes', 'a1']],
      ['uuid-a', ['a2']],
    ]);
    expect(ids(shiftChannel(layout(), 'a2', 1)).slice(1)).toEqual([
      ['uuid-a', ['a1']],
      ['uuid-b', ['a2', 'b1']],
    ]);
  });

  it('no hace nada en los extremos de la lista', () => {
    const categories = layout();
    expect(shiftChannel(categories, 'general', -1)).toBe(categories);
    expect(shiftChannel(categories, 'b1', 1)).toBe(categories);
  });
});

describe('shiftCategory', () => {
  it('mueve una categoría real un lugar', () => {
    expect(shiftCategory(layout(), 'uuid-b', -1).map((c) => c.id)).toEqual([GENERAL, 'uuid-b', 'uuid-a']);
    expect(shiftCategory(layout(), 'uuid-a', 1).map((c) => c.id)).toEqual([GENERAL, 'uuid-b', 'uuid-a']);
  });

  it('no pasa por encima de la sección general ni se mueve fuera de los extremos', () => {
    const categories = layout();
    expect(shiftCategory(categories, 'uuid-a', -1)).toBe(categories);
    expect(shiftCategory(categories, 'uuid-b', 1)).toBe(categories);
    expect(shiftCategory(categories, GENERAL, 1)).toBe(categories);
  });
});

describe('payloads de reorden', () => {
  it('toChannelOrder manda todos los canales en orden, con null para la sección general', () => {
    expect(toChannelOrder(layout())).toEqual([
      { id: 'general', category_id: null },
      { id: 'memes', category_id: null },
      { id: 'a1', category_id: 'uuid-a' },
      { id: 'a2', category_id: 'uuid-a' },
      { id: 'b1', category_id: 'uuid-b' },
    ]);
  });

  it('toCategoryOrder manda solo las categorías reales', () => {
    expect(toCategoryOrder(layout())).toEqual(['uuid-a', 'uuid-b']);
  });
});
