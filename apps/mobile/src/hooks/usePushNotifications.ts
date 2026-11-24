import { useEffect, useEffectEvent } from 'react'
import * as Notifications from 'expo-notifications'
import { useQueryClient } from '@tanstack/react-query'
import { resolvePushDestination, type NotificationDestination } from '@discordia/core'
import { hideForegroundNotifications, registerForPush } from '../utils/push'

hideForegroundNotifications()

/**
 * Push en la app con sesión: registra el dispositivo al entrar y, al tocar un aviso (app cerrada o en segundo
 * plano), lleva a la conversación con `onOpen`, el mismo destino que abrir el aviso desde la bandeja.
 */
export function usePushNotifications(onOpen: (destination: NotificationDestination) => void) {
  const queryClient = useQueryClient()
  const response = Notifications.useLastNotificationResponse()
  const open = useEffectEvent(onOpen)

  useEffect(() => {
    // Sin token (simulador, Android sin FCM) la app sigue: la bandeja avisa igual
    registerForPush().catch(err => console.warn('[push] no se pudo registrar el dispositivo', err))
  }, [])

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
    // Se limpia para no volver a navegar si la pantalla se vuelve a montar
    Notifications.clearLastNotificationResponse()
    void resolvePushDestination(queryClient, response.notification.request.content.data).then(destination => {
      if (destination) open(destination)
    })
  }, [response, queryClient])
}
