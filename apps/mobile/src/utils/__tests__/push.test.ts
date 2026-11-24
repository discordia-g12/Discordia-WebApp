import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Notifications from 'expo-notifications'
import { registerPushDevice, unregisterPushDevice } from '@discordia/core'
import { hideForegroundNotifications, registerForPush, unregisterFromPush, UNREGISTER_TIMEOUT_MS } from '../push'

const platform = vi.hoisted(() => ({ OS: 'ios' }))

vi.mock('react-native', () => ({ Platform: platform }))
vi.mock('expo-notifications', () => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  getExpoPushTokenAsync: vi.fn(),
  setNotificationHandler: vi.fn(),
}))
vi.mock('@discordia/core', () => ({ registerPushDevice: vi.fn(), unregisterPushDevice: vi.fn() }))

const TOKEN = 'ExponentPushToken[abc]'
const permissions = (status: string, canAskAgain = true) => ({ status, canAskAgain }) as never

describe('registerForPush', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    platform.OS = 'ios'
    vi.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: TOKEN })
    vi.mocked(registerPushDevice).mockResolvedValue(undefined)
    vi.mocked(unregisterPushDevice).mockResolvedValue(undefined)
    await unregisterFromPush()
    vi.clearAllMocks()
  })

  it('con permiso registra el token con la plataforma', async () => {
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permissions('granted'))
    expect(await registerForPush()).toBe(TOKEN)
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(registerPushDevice).toHaveBeenCalledWith({ platform: 'ios', token: TOKEN })
  })

  it('sin permiso todavía lo pide, y si lo niega no registra nada', async () => {
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permissions('undetermined'))
    vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(permissions('denied'))
    expect(await registerForPush()).toBeNull()
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled()
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled()
    expect(registerPushDevice).not.toHaveBeenCalled()
  })

  it('si ya lo negó para siempre no vuelve a preguntar', async () => {
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permissions('denied', false))
    expect(await registerForPush()).toBeNull()
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
  })

  it('en web (react-native-web) no hace nada', async () => {
    platform.OS = 'web'
    expect(await registerForPush()).toBeNull()
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled()
  })
})

describe('unregisterFromPush', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platform.OS = 'android'
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permissions('granted'))
    vi.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: TOKEN })
  })

  it('borra el token registrado una sola vez, con timeout corto', async () => {
    await registerForPush()
    await unregisterFromPush()
    await unregisterFromPush()
    expect(unregisterPushDevice).toHaveBeenCalledTimes(1)
    expect(unregisterPushDevice).toHaveBeenCalledWith(TOKEN, { timeoutMs: UNREGISTER_TIMEOUT_MS })
  })

  it('si el DELETE falla no lanza: el cierre de sesión sigue', async () => {
    await registerForPush()
    vi.mocked(unregisterPushDevice).mockRejectedValue(new Error('red'))
    await expect(unregisterFromPush()).resolves.toBeUndefined()
  })
})

describe('hideForegroundNotifications', () => {
  it('en primer plano no muestra, no suena y no cambia el badge', async () => {
    hideForegroundNotifications()
    const handler = vi.mocked(Notifications.setNotificationHandler).mock.calls[0][0]
    expect(await handler?.handleNotification({} as never)).toEqual({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    })
  })
})
