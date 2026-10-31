/**
 * Menciones (historia #46). En el texto del mensaje van como tokens: `<@userId>`, `<@&roleId>` y
 * `@everyone`. Chat-Engine los parsea al enviar y devuelve en `mentions` las que notifican: un @everyone o
 * un rol escrito sin MENTION_EVERYONE queda en el texto pero no ahí, y se muestra como texto plano.
 * Las expresiones son las mismas que en Chat-Engine (`src/helpers/mentions.ts`).
 */

/** Lo que notifica de un mensaje, según Chat-Engine. */
export interface MessageMentions {
  users: string[];
  roles: string[];
  everyone: boolean;
}

export type MentionSegment =
  | { type: 'text'; text: string }
  | { type: 'user'; id: string }
  /** `active`: notificó (estaba en `mentions`). Si no, se muestra como texto. */
  | { type: 'role'; id: string; active: boolean }
  | { type: 'everyone'; active: boolean };

// Rol, usuario o @everyone suelto (no "mail@everyone" ni "@everyones"). Sin lookbehind, por Hermes:
// el carácter anterior a @everyone se captura y se devuelve como texto.
const TOKENS = /<@&([^\s<>@&]{1,128})>|<@([^\s<>@&]{1,128})>|(^|[^\w@])@everyone(?![\w-])/g;

/** Parte el texto en texto y menciones, para mostrarlas como `@nombre` y `@rol`. */
export function splitMentions(content: string, mentions?: MessageMentions): MentionSegment[] {
  const segments: MentionSegment[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last?.type === 'text') last.text += text;
    else segments.push({ type: 'text', text });
  };

  let cursor = 0;
  for (const match of content.matchAll(TOKENS)) {
    const [whole, roleId, userId, prefix] = match;
    pushText(content.slice(cursor, match.index));
    if (roleId !== undefined) {
      segments.push({ type: 'role', id: roleId, active: mentions?.roles.includes(roleId) ?? false });
    } else if (userId !== undefined) {
      segments.push({ type: 'user', id: userId });
    } else {
      pushText(prefix);
      segments.push({ type: 'everyone', active: mentions?.everyone ?? false });
    }
    cursor = (match.index ?? 0) + whole.length;
  }
  pushText(content.slice(cursor));
  return segments;
}

/** El mensaje menciona al usuario: a él, a @everyone o a uno de sus roles. */
export function mentionsUser(mentions: MessageMentions | undefined, userId: string, roleIds: string[] = []): boolean {
  if (!mentions || !userId) return false;
  return mentions.everyone || mentions.users.includes(userId) || mentions.roles.some((id) => roleIds.includes(id));
}

/** Una mención elegida en el composer: se ve como `@label` y se envía como `token`. */
export interface PickedMention {
  label: string;
  token: string;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pasa a tokens las menciones que el usuario ve como `@label` en el composer. Primero las más largas, para
 * que `@ana` no pise a `@ana_b`. Solo `@label` suelto: no dentro de un mail ni seguido de letras.
 */
export function encodeMentions(text: string, picked: PickedMention[]): string {
  const byLabel = new Map<string, string>();
  for (const { label, token } of picked) {
    if (label && !byLabel.has(label)) byLabel.set(label, token);
  }
  if (byLabel.size === 0) return text;

  const labels = [...byLabel.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const pattern = new RegExp(`(^|[^\\w@])@(${labels.join('|')})(?![\\w-])`, 'g');
  return text.replace(pattern, (_whole, prefix: string, label: string) => `${prefix}${byLabel.get(label)}`);
}

/**
 * El texto con las menciones como `@nombre` y `@rol`, para donde no se pueden mostrar resaltadas (vista
 * previa de una respuesta, fijados, copiar el mensaje, mobile).
 */
export function mentionsToText(
  content: string,
  names: { user: (id: string) => string; role: (id: string) => string }
): string {
  return splitMentions(content)
    .map((segment) => {
      if (segment.type === 'text') return segment.text;
      if (segment.type === 'user') return `@${names.user(segment.id)}`;
      if (segment.type === 'role') return `@${names.role(segment.id)}`;
      return '@everyone';
    })
    .join('');
}
