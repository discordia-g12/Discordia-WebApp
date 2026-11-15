import { describe, it, expect } from 'vitest';
import { ApiError } from '../../api/errors';
import { DM_PENDING_MESSAGE } from '../../dm/errors';
import { CALL_BUSY_MESSAGE, callEndMessage, callErrorMessage } from '../messages';

describe('callEndMessage', () => {
  it('quien llama se entera de cómo terminó', () => {
    expect(callEndMessage('declined', 'caller')).toBe('no puede atender ahora');
    expect(callEndMessage('missed', 'caller')).toBe('no respondió');
    expect(callEndMessage('canceled', 'caller')).toBe('llamada cancelada');
    expect(callEndMessage('ended', 'caller')).toBe('llamada finalizada');
  });

  it('quien recibe solo distingue si la perdió', () => {
    expect(callEndMessage('missed', 'callee')).toBe('llamada perdida');
    expect(callEndMessage('canceled', 'callee')).toBe('llamada perdida');
    expect(callEndMessage('ended', 'callee')).toBe('llamada finalizada');
  });

  it('unavailable nunca dice que hay un bloqueo', () => {
    for (const role of ['caller', 'callee'] as const) {
      expect(callEndMessage('unavailable', role)).toBe('no se pudo completar la llamada');
      expect(callEndMessage('unavailable', role)).not.toMatch(/bloque/);
    }
  });
});

describe('callErrorMessage', () => {
  const problem = (status: number, code?: string) => new ApiError({ status, code, detail: code });

  it('traduce los códigos de Voice', () => {
    expect(callErrorMessage(problem(409, 'CALL_BUSY'))).toBe(CALL_BUSY_MESSAGE);
    expect(CALL_BUSY_MESSAGE).toBe('está en otra llamada');
    expect(callErrorMessage(problem(409, 'CALL_NOT_RINGING'))).toBe('la llamada ya terminó');
    expect(callErrorMessage(problem(403, 'DM_PENDING'))).toBe(DM_PENDING_MESSAGE);
  });

  it('un rechazo de entrega es genérico', () => {
    expect(callErrorMessage(problem(403, 'DM_NOT_DELIVERABLE'))).toBe('no se pudo completar la llamada');
    expect(callErrorMessage(problem(403))).toBe('no se pudo completar la llamada');
  });

  it('cualquier otro error es de conexión', () => {
    expect(callErrorMessage(problem(503))).toBe('no se pudo conectar la llamada');
    expect(callErrorMessage(new Error('LiveKit'))).toBe('no se pudo conectar la llamada');
  });
});
