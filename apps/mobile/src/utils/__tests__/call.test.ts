import { describe, expect, it } from 'vitest'
import { INITIAL_CALL_STATE, type Call, type PrivateCallState } from '@discordia/core'
import { callEndText, callSentence, callStatusLine, formatCallDuration, isCallOpen, sentence } from '../call'

const call: Call = {
  id: 'c1',
  conversationId: 'dm-u1',
  callerId: 'u0',
  calleeId: 'u1',
  status: 'active',
  createdAt: '2026-11-12T10:00:00.000Z',
  expiresAt: '2026-11-12T10:00:30.000Z',
  answeredAt: '2026-11-12T10:00:05.000Z',
}

const answeredAt = Date.parse(call.answeredAt!)
const base = { finished: [], conversationId: 'dm-u1' }

describe('formatCallDuration', () => {
  it('muestra minutos y segundos, y horas si hacen falta', () => {
    expect(formatCallDuration(0)).toBe('0:00')
    expect(formatCallDuration(42_900)).toBe('0:42')
    expect(formatCallDuration(12 * 60_000 + 5_000)).toBe('12:05')
    expect(formatCallDuration(3_600_000 + 2 * 60_000 + 9_000)).toBe('1:02:09')
  })

  it('no muestra negativos (el reloj del teléfono atrasado respecto de Voice)', () => {
    expect(formatCallDuration(-5_000)).toBe('0:00')
  })
})

describe('callStatusLine', () => {
  const active: PrivateCallState = { ...base, status: 'active', call, role: 'caller' }

  it('quien llama: llamando… mientras suena, aunque el POST todavía no respondió', () => {
    expect(callStatusLine({ ...base, status: 'outgoing', call: null, role: 'caller' }, 'connecting', 0)).toBe('llamando…')
  })

  it('quien recibe: te está llamando, y conectando al atender', () => {
    const incoming: PrivateCallState = { ...base, status: 'incoming', call: { ...call, status: 'ringing' }, role: 'callee', accepting: false }
    expect(callStatusLine(incoming, 'disconnected', 0)).toBe('te está llamando')
    expect(callStatusLine({ ...incoming, accepting: true }, 'disconnected', 0)).toBe('conectando')
  })

  it('activa: conectando mientras entra a la sala; después, la duración desde que atendió', () => {
    expect(callStatusLine(active, 'connecting', answeredAt + 10_000)).toBe('conectando')
    expect(callStatusLine(active, 'reconnecting', answeredAt + 10_000)).toBe('reconectando')
    expect(callStatusLine(active, 'connected', answeredAt + 75_000)).toBe('1:15')
  })

  it('activa sin sala (mock de API): la duración igual', () => {
    expect(callStatusLine(active, 'disconnected', answeredAt + 3_000)).toBe('0:03')
  })

  it('sin llamada o terminada: nada', () => {
    expect(callStatusLine(INITIAL_CALL_STATE, 'disconnected', 0)).toBeNull()
    expect(callStatusLine({ ...base, status: 'ended', call, role: 'caller', reason: 'ended' }, 'disconnected', 0)).toBeNull()
  })
})

describe('textos', () => {
  it('sentence pone la primera letra en mayúscula', () => {
    expect(sentence('llamada perdida')).toBe('Llamada perdida')
    expect(sentence('')).toBe('')
  })

  it('lo que habla del otro lleva su nombre; lo demás va como oración', () => {
    expect(callSentence('está en otra llamada', 'Lu')).toBe('Lu está en otra llamada')
    expect(callSentence('no se pudo conectar la llamada', 'Lu')).toBe('No se pudo conectar la llamada')
  })

  it('callEndText: quien llama se entera del motivo; quien recibe, si la perdió', () => {
    expect(callEndText('declined', 'caller', 'Lu')).toBe('Lu no puede atender ahora')
    expect(callEndText('missed', 'caller', 'Lu')).toBe('Lu no respondió')
    expect(callEndText('ended', 'caller', 'Lu')).toBe('Llamada finalizada')
    expect(callEndText('canceled', 'callee', 'Lu')).toBe('Llamada perdida')
  })

  it('unavailable nunca dice que hubo un bloqueo', () => {
    expect(callEndText('unavailable', 'caller', 'Lu')).toBe('No se pudo completar la llamada')
  })
})

describe('isCallOpen', () => {
  it('sonando o activa sí; sin llamada o terminada no', () => {
    expect(isCallOpen({ ...base, status: 'active', call, role: 'callee' })).toBe(true)
    expect(isCallOpen({ ...base, status: 'outgoing', call: null, role: 'caller' })).toBe(true)
    expect(isCallOpen(INITIAL_CALL_STATE)).toBe(false)
    expect(isCallOpen({ ...base, status: 'ended', call, role: 'callee', reason: 'missed' })).toBe(false)
  })
})
