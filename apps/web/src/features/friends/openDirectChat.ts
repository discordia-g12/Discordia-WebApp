import { useUIStore } from '../../app/uiStore';
import { selectServer } from '../servers/serverActions';

/** Abre el chat con un usuario desde cualquier pantalla. Abrirlo no crea nada: la conversación nace con el primer mensaje. */
export function openDirectChat(userId: string) {
  selectServer('home', []);
  useUIStore.getState().setSelectedDm({ type: 'chat', userId });
}
