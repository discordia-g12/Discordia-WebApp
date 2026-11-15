import { setApiMock, type AuthAdapter } from '@discordia/core'
import { createApiMock } from '@discordia/core/testing'
import { mobileAuthAdapter } from '../api/auth'

// JWT sin firma con { sub: 'mock|u0' }. En este modo no hay backend: no abre nada.
const MOCK_TOKEN = 'e30.eyJzdWIiOiJtb2NrfHUwIn0.mock'

const MOCK_USER = { sub: 'mock|u0', email: 'alex.rivera@discordia.gg', nickname: 'alexr', name: 'Alex Rivera' }

const apiMock = createApiMock()

// Llamada entrante simulada (EXPO_PUBLIC_MOCK_INCOMING_CALL): da tiempo a que cargue la app
const MOCK_INCOMING_CALL_DELAY_MS = 10_000

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
 * sin red. Desde la consola, `__discordiaMock.simulateIncomingMessage('u1', 'hola')` hace llegar un DM y
 * `__discordiaMock.simulateIncomingCall('u1')`, una llamada. Sin consola (Expo Go en el simulador),
 * EXPO_PUBLIC_MOCK_INCOMING_CALL=u1 hace sonar una llamada de u1 a los 10 s de abrir la app.
 */
export async function installMockSession(): Promise<AuthAdapter> {
  setApiMock(apiMock)
  // DataProvider no pide nada sin el token de la sesión de mobile
  await mobileAuthAdapter.completeTwoFactorSession?.(MOCK_TOKEN, MOCK_USER)
  ;(globalThis as { __discordiaMock?: typeof apiMock }).__discordiaMock = apiMock
  const caller = process.env.EXPO_PUBLIC_MOCK_INCOMING_CALL
  if (caller) setTimeout(() => apiMock.simulateIncomingCall(caller), MOCK_INCOMING_CALL_DELAY_MS)
  return mockAdapter
}
