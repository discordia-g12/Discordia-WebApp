import { setApiMock, type AuthAdapter } from '@discordia/core'
import { createApiMock } from '@discordia/core/testing'
import { mobileAuthAdapter } from '../api/auth'

// JWT sin firma con { sub: 'mock|u0' }. En este modo no hay backend: no abre nada.
const MOCK_TOKEN = 'e30.eyJzdWIiOiJtb2NrfHUwIn0.mock'

const MOCK_USER = { sub: 'mock|u0', email: 'alex.rivera@discordia.gg', nickname: 'alexr', name: 'Alex Rivera' }

const apiMock = createApiMock()

let authenticated = true

const mockAdapter: AuthAdapter = {
  async getToken() {
    if (!authenticated) throw new Error('login_required')
    return MOCK_TOKEN
  },
  async getUser() {
    return MOCK_USER
  },
  async loginWithCredentials() {
    authenticated = true
  },
  async signupWithCredentials() {
    authenticated = true
  },
  async logout() {
    authenticated = false
  },
}

/**
 * Modo mock (solo desarrollo, EXPO_PUBLIC_USE_MOCK=true): la sesión y la API de @discordia/core/testing, para
 * probar sin backend. Lo que el mock no cubre (no leídos de canales, sockets de canal, adjuntos) falla como
 * sin red. Desde la consola, `__discordiaMock.simulateIncomingMessage('u1', 'hola')` hace llegar un DM.
 */
export async function installMockSession(): Promise<AuthAdapter> {
  setApiMock(apiMock)
  // DataProvider no pide nada sin el token de la sesión de mobile
  await mobileAuthAdapter.completeTwoFactorSession?.(MOCK_TOKEN, MOCK_USER)
  ;(globalThis as { __discordiaMock?: typeof apiMock }).__discordiaMock = apiMock
  return mockAdapter
}
