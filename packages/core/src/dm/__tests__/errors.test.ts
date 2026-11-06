import { describe, it, expect } from 'vitest';
import { ApiError } from '../../api/errors';
import { DM_COMPOSER_MESSAGES } from '../actions';
import { DM_PENDING_MESSAGE, dmErrorCode, dmSendErrorMessage } from '../errors';

describe('dmErrorCode', () => {
  it('encuentra el código en cualquier campo del error o en el texto del WebSocket', () => {
    expect(dmErrorCode(new ApiError({ status: 403, code: 'DM_PENDING' }))).toBe('DM_PENDING');
    expect(dmErrorCode(new ApiError({ status: 403, detail: 'DM_NOT_DELIVERABLE' }))).toBe('DM_NOT_DELIVERABLE');
    expect(dmErrorCode(new ApiError({ status: 403, type: 'https://discordia.app/problems/DM_PENDING' }))).toBe('DM_PENDING');
    expect(dmErrorCode('DM_PENDING')).toBe('DM_PENDING');
  });

  it('no encuentra nada en otros errores', () => {
    expect(dmErrorCode(new ApiError({ status: 500 }))).toBeUndefined();
    expect(dmErrorCode(new Error('DM_PENDING'))).toBeUndefined();
    expect(dmErrorCode(undefined)).toBeUndefined();
  });
});

describe('dmSendErrorMessage', () => {
  it('explica la solicitud pendiente', () => {
    expect(dmSendErrorMessage('DM_PENDING')).toBe(DM_PENDING_MESSAGE);
  });

  it('todo lo demás es el error genérico de entrega', () => {
    expect(dmSendErrorMessage(new ApiError({ status: 403, code: 'DM_NOT_DELIVERABLE' }))).toBe(
      DM_COMPOSER_MESSAGES.undeliverable
    );
    expect(dmSendErrorMessage(new ApiError({ status: 503 }))).toBe(DM_COMPOSER_MESSAGES.undeliverable);
    expect(dmSendErrorMessage('The user blocked you')).toBe(DM_COMPOSER_MESSAGES.undeliverable);
  });
});
