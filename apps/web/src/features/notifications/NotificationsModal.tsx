import { Modal } from '../../ui';
import { NotificationList } from './NotificationList';

/** Avisos en escritorio: se abre con la campana del rail. */
export function NotificationsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Avisos" description="mensajes directos, menciones y respuestas en tus hilos" onClose={onClose}>
      <NotificationList onOpened={onClose} />
    </Modal>
  );
}
