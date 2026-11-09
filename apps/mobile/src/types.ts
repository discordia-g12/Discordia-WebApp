// Modelos de dominio y DTO del backend: los mismos que la web, desde @discordia/core. Mobile solo suma el
// estado del envío optimista de un mensaje.
import type { Message as CoreMessage } from '@discordia/core'

export type {
  Category,
  Channel,
  ChannelBackendResponse,
  ChannelType,
  MessageAttachment,
  MessageBackendPayload,
  MessageType,
  Reaction,
  Role,
  RoleBackendResponse,
  RoleMember,
  RoleMemberBackendResponse,
  Server,
  ServerBackendResponse,
  ServerMember,
  ServerMemberBackendResponse,
  ServerMemberPage,
  ServerMemberPageBackendResponse,
  Status,
  User,
} from '@discordia/core'

/** Envío optimista: el mensaje se muestra al tocar ENVIAR y se confirma cuando vuelve por el WebSocket. */
export type MessageStatus = 'pending' | 'sent' | 'failed'

export interface Message extends CoreMessage {
  status?: MessageStatus
  /** Id temporal con el que se mostró al enviarlo: se conserva al confirmarse para que la fila no se vuelva a montar. */
  localId?: string
}
