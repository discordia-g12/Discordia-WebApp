import type { ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { setVoicePlatform, useInbox, useVoiceRoom } from '@discordia/core';
import { USERS } from '@discordia/core/testing';
import { UsersContext } from '../app/usersContext';
import { useUIStore } from '../app/uiStore';
import { ChatConnectionContext } from '../features/chat/chatConnectionContext';
import { VoiceContext } from '../features/voice/voiceContext';
import { CallProvider } from '../features/calls/CallProvider';

// Sin LiveKit: con el mock de API las llamadas no entran a la sala, y los tests no entran a canales de voz
setVoicePlatform({
  livekit: () => {
    throw new Error('Los tests de DMs no entran a salas de voz');
  },
});

/** La sala de voz real (sin LiveKit) sin la presencia ni los servidores de VoiceProvider. */
function Voice({ children }: { children: ReactNode }) {
  const room = useVoiceRoom();
  const value = {
    room,
    presence: {},
    join: async () => {},
    disconnect: () => {},
    isSwitching: () => false,
    toggleCamera: async () => {},
    toggleScreenShare: async () => {},
  };
  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

function Inbox() {
  useInbox({ activeConversationId: useUIStore((s) => s.readingChannelId) });
  return null;
}

/** Lo que la app monta alrededor del inicio, con los usuarios de prueba, el socket inbox, la voz y la llamada privada. */
export function DmProviders({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <UsersContext.Provider value={{ usersMap: USERS, userOrFallback: (id) => USERS[id] }}>
        <ChatConnectionContext.Provider value={{ send: async () => {}, isReconnecting: false, canSend: true, removedReason: null }}>
          <Voice>
            <CallProvider>
              <Inbox />
              {children}
            </CallProvider>
          </Voice>
        </ChatConnectionContext.Provider>
      </UsersContext.Provider>
    </QueryClientProvider>
  );
}
