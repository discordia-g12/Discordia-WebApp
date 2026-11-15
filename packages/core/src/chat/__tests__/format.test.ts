import { describe, expect, it } from 'vitest';
import { formatDayLabel, formatMessageHour, formatMessageTime, placeMessage } from '../format';

describe('formato del chat', () => {
  it('fecha corta en 24 h y hora sola', () => {
    const iso = new Date(2025, 9, 20, 13, 25).toISOString();
    expect(formatMessageTime(iso)).toBe('20/10/25, 13:25');
    expect(formatMessageHour(iso)).toBe('13:25');
    expect(formatMessageTime('no es una fecha')).toBe('');
  });

  it('separador de día: hoy, ayer o la fecha larga', () => {
    const now = new Date(2025, 9, 22, 12, 0);
    expect(formatDayLabel(new Date(2025, 9, 22, 8, 0), now)).toBe('hoy');
    expect(formatDayLabel(new Date(2025, 9, 21, 23, 0), now)).toBe('ayer');
    expect(formatDayLabel(new Date(2025, 9, 20, 10, 0), now)).toBe('20 de octubre de 2025');
  });
});

describe('placeMessage', () => {
  const at = (h: number, m: number, day = 20) => new Date(2025, 9, day, h, m).toISOString();

  it('el primer mensaje abre el día y no se agrupa', () => {
    const { newDay, grouped } = placeMessage(null, { authorId: 'a', timestamp: at(10, 0) });
    expect(newDay).not.toBeNull();
    expect(grouped).toBe(false);
  });

  it('agrupa a la misma persona dentro de 5 minutos', () => {
    expect(placeMessage({ authorId: 'a', timestamp: at(10, 0) }, { authorId: 'a', timestamp: at(10, 4) }).grouped).toBe(true);
    expect(placeMessage({ authorId: 'a', timestamp: at(10, 0) }, { authorId: 'a', timestamp: at(10, 6) }).grouped).toBe(false);
    expect(placeMessage({ authorId: 'a', timestamp: at(10, 0) }, { authorId: 'b', timestamp: at(10, 1) }).grouped).toBe(false);
  });

  it('no agrupa mensajes de sistema ni al cambiar de día', () => {
    expect(placeMessage({ authorId: 'a', timestamp: at(10, 0), type: 'system' }, { authorId: 'a', timestamp: at(10, 1) }).grouped).toBe(false);
    const nextDay = placeMessage({ authorId: 'a', timestamp: at(23, 58) }, { authorId: 'a', timestamp: at(0, 1, 21) });
    expect(nextDay.newDay).not.toBeNull();
    expect(nextDay.grouped).toBe(false);
  });

  it('no agrupa mensajes eliminados ni mensajes que siguen a uno eliminado', () => {
    expect(placeMessage({ authorId: 'a', timestamp: at(10, 0), type: 'deleted' }, { authorId: 'a', timestamp: at(10, 1) }).grouped).toBe(false);
    expect(placeMessage({ authorId: 'a', timestamp: at(10, 0) }, { authorId: 'a', timestamp: at(10, 1), type: 'deleted' }).grouped).toBe(false);
  });
});
