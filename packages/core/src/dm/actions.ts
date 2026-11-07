import type { Conversation, Relationship } from '../types';
import { isMessageRequest, isWaitingForReply } from './inboxList';

/**
 * Qué se muestra en lugar del composer. `open`: se puede escribir. `message_request`: aceptar, rechazar o
 * bloquear. Los demás muestran un texto (ver DM_COMPOSER_MESSAGES).
 */
export type DmComposerState = 'open' | 'waiting_reply' | 'message_request' | 'blocked' | 'undeliverable';

/** Los textos que reemplazan al composer. */
export const DM_COMPOSER_MESSAGES: Record<Exclude<DmComposerState, 'open' | 'message_request'>, string> = {
  waiting_reply: 'Esperando respuesta.',
  blocked: 'Desbloqueá para escribir.',
  undeliverable: 'No se pudo entregar tu mensaje.',
};

export interface DmActions {
  composer: DmComposerState;
  /** Texto en lugar del composer, o null si no corresponde. */
  composerMessage: string | null;
  /** Abrir el chat desde el perfil. */
  canMessage: boolean;
  /** Mandar una solicitud de amistad. */
  canAddFriend: boolean;
  /** Ya hay una solicitud enviada: "solicitud enviada", con opción de cancelarla. */
  canCancelFriendRequest: boolean;
  /** Hay una solicitud recibida: aceptar o rechazar, independiente de la solicitud de mensaje. */
  canRespondFriendRequest: boolean;
  canRemoveFriend: boolean;
  /** Aceptar o rechazar la solicitud de mensaje. */
  canRespondMessageRequest: boolean;
  canBlock: boolean;
  canUnblock: boolean;
}

export interface DmActionsInput {
  relationship: Relationship;
  /** La conversación con esa persona, si existe. En el perfil puede no venir. */
  conversation?: Conversation | null;
  /** `canMessage` de getConversationWith, si ya se consultó. */
  canMessage?: boolean;
}

function composerState({ relationship, conversation, canMessage }: DmActionsInput): DmComposerState {
  if (relationship === 'blocked') return 'blocked';
  // Entre amigos la conversación queda aceptada; acá solo puede estar vieja en el caché
  if (conversation && relationship !== 'friend') {
    if (isWaitingForReply(conversation)) return 'waiting_reply';
    if (isMessageRequest(conversation)) return 'message_request';
  }
  return canMessage === false ? 'undeliverable' : 'open';
}

/**
 * Traduce la relación y el estado de la conversación a lo que se muestra en el chat y en el perfil. Si el
 * otro bloqueó al usuario, `relationship` es `none`: `canMessage` en false da un error genérico de entrega.
 */
export function dmActions(input: DmActionsInput): DmActions {
  const { relationship } = input;
  const composer = composerState(input);
  return {
    composer,
    composerMessage: composer === 'open' || composer === 'message_request' ? null : DM_COMPOSER_MESSAGES[composer],
    canMessage: relationship !== 'blocked',
    canAddFriend: relationship === 'none',
    canCancelFriendRequest: relationship === 'request_sent',
    canRespondFriendRequest: relationship === 'request_received',
    canRemoveFriend: relationship === 'friend',
    canRespondMessageRequest: composer === 'message_request',
    canBlock: relationship !== 'blocked',
    canUnblock: relationship === 'blocked',
  };
}
