import { useEffect, useState } from 'react';
import { useChatReconnecting } from '../features/chat/chatConnectionContext';
import { useVoice } from '../features/voice/voiceContext';

/** Si el navegador tiene red (eventos online / offline). */
function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}

/**
 * true mientras la app está volviendo a conectarse: sin red, con el chat del canal reconectando o con la
 * llamada reconectando. Lo usan el banner de arriba y el "reconectando/" de la barra de usuario.
 */
export function useIsReconnecting(): boolean {
  const online = useOnline();
  const chatReconnecting = useChatReconnecting();
  const voice = useVoice();
  return !online || chatReconnecting || voice.room.connectionState === 'reconnecting';
}
