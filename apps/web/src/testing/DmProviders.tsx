import type { ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useInbox } from '@discordia/core';
import { USERS } from '@discordia/core/testing';
import { UsersContext } from '../app/usersContext';
import { useUIStore } from '../app/uiStore';
import { ChatConnectionContext } from '../features/chat/chatConnectionContext';

function Inbox() {
  useInbox({ activeConversationId: useUIStore((s) => s.readingChannelId) });
  return null;
}

/** Lo que la app monta alrededor del inicio, con los usuarios de prueba y el socket inbox. */
export function DmProviders({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <UsersContext.Provider value={{ usersMap: USERS, userOrFallback: (id) => USERS[id] }}>
        <ChatConnectionContext.Provider value={{ send: async () => {}, isReconnecting: false, canSend: true, removedReason: null }}>
          <Inbox />
          {children}
        </ChatConnectionContext.Provider>
      </UsersContext.Provider>
    </QueryClientProvider>
  );
}
