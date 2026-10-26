import { create } from 'zustand';
import type { DirectMessage, Message } from '../../types';

interface DmState {
  directMessages: DirectMessage[];
  /** Mensajes de cada DM, por id de conversación. */
  messagesByDm: Record<string, Message[]>;
  updateMessages: (dmId: string, update: (messages: Message[]) => Message[]) => void;
  setLastMessage: (dmId: string, content: string) => void;
}

/**
 * Mensajes directos. Todavía no hay backend de DMs: viven solo en esta sesión del navegador.
 */
export const useDmStore = create<DmState>((set) => ({
  directMessages: [],
  messagesByDm: {},

  updateMessages: (dmId, update) =>
    set((s) => ({ messagesByDm: { ...s.messagesByDm, [dmId]: update(s.messagesByDm[dmId] || []) } })),

  setLastMessage: (dmId, content) =>
    set((s) => ({
      directMessages: s.directMessages.map((dm) =>
        dm.id === dmId ? { ...dm, lastMessage: content, lastTimestamp: 'Just now' } : dm
      ),
    })),
}));
