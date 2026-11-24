import { describe, expect, it } from 'vitest'
import type { Server } from '@discordia/core'
import { fromLevelChoice, notificationChannelName, toLevelChoice } from '../notifications'

const servers = [
  { id: 's1', categories: [{ id: 'c1', channels: [{ id: 'ch1', name: 'general' }] }] },
] as unknown as Server[]

describe('notificationChannelName', () => {
  it('busca el canal en el servidor del aviso', () => {
    expect(notificationChannelName(servers, 's1', 'ch1')).toBe('general')
  })

  it('devuelve null en un DM o si el servidor o el canal no están cargados', () => {
    expect(notificationChannelName(servers, null, 'dm-u1')).toBeNull()
    expect(notificationChannelName(servers, 's2', 'ch1')).toBeNull()
    expect(notificationChannelName(servers, 's1', 'ch9')).toBeNull()
  })
})

describe('toLevelChoice / fromLevelChoice', () => {
  it('nivel null es "Heredar" y vuelve como null', () => {
    expect(toLevelChoice(null)).toBe('inherit')
    expect(fromLevelChoice('inherit')).toBeNull()
  })

  it('los niveles pasan como están', () => {
    expect(toLevelChoice('mentions')).toBe('mentions')
    expect(fromLevelChoice('all')).toBe('all')
  })
})
