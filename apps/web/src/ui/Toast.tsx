import type { ToastType } from '../app/uiStore';

/**
 * Componente Toast para avisos flotantes efímeros.
 */
export function ToastNotification({
  message,
  type = 'info',
}: {
  message: string;
  type?: ToastType;
}) {
  const bg =
    type === 'success' ? '#23a55a' : type === 'danger' ? '#ed4245' : 'var(--brand-blurple, #5865f2)';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        backgroundColor: bg,
        color: '#ffffff',
        padding: '10px 18px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {message}
    </div>
  );
}
