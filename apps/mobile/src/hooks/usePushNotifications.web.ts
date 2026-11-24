import type { NotificationDestination } from '@discordia/core'

/** En Expo web no hay push nativo (expo-notifications no implementa web): la bandeja avisa igual. */
export function usePushNotifications(_onOpen: (destination: NotificationDestination) => void) {}
