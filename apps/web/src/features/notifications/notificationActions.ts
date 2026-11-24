import { notificationDestination, type AppNotification, type NotificationDestination } from '@discordia/core';
import { useUIStore } from '../../app/uiStore';

/**
 * Lleva a donde pasó lo del aviso (CA1 del centro de notificaciones): el canal del servidor o el chat con
 * quien escribió y, si es de un hilo, lo abre. El mensaje que lo generó es de los últimos: queda a la vista
 * al abrir el chat, sin saltar.
 */
export function openNotification(notification: AppNotification) {
  openDestination(notificationDestination(notification));
}

/** Lo mismo desde un destino ya resuelto (el de un push, en usePushNavigation). */
export function openDestination(destination: NotificationDestination) {
  const ui = useUIStore.getState();
  switch (destination.kind) {
    case 'channel':
      ui.setSelectedServerId(destination.serverId);
      ui.setAppView('chat');
      ui.setSelectedChannelId(destination.channelId);
      break;
    case 'dm':
      ui.setSelectedServerId('home');
      ui.setAppView('home');
      ui.setSelectedDm({ type: 'chat', userId: destination.userId });
      break;
  }
  // Después de navegar: cambiar de canal cierra el hilo que estaba abierto
  if (destination.threadId) {
    ui.setOpenThread({
      channelId: destination.channelId,
      messageId: destination.threadId,
      serverId: destination.kind === 'channel' ? destination.serverId : null,
    });
  }
}
