import type { AppNotification } from '@discordia/core';
import { useUIStore } from '../../app/uiStore';

/**
 * Lleva a donde pasó lo del aviso (CA1 del centro de notificaciones): el canal del servidor o el chat con
 * quien escribió y, si es de un hilo, lo abre. En un DM 1 a 1 quien escribió es el otro participante.
 */
export function openNotification(notification: AppNotification) {
  const ui = useUIStore.getState();
  if (notification.serverId) {
    ui.setSelectedServerId(notification.serverId);
    ui.setAppView('chat');
    ui.setSelectedChannelId(notification.channelId);
  } else {
    ui.setSelectedServerId('home');
    ui.setAppView('home');
    ui.setSelectedDm({ type: 'chat', userId: notification.actorId });
  }
  // Después de navegar: cambiar de canal cierra el hilo que estaba abierto
  if (notification.threadId) {
    ui.setOpenThread({
      channelId: notification.channelId,
      messageId: notification.threadId,
      serverId: notification.serverId,
    });
  }
}
