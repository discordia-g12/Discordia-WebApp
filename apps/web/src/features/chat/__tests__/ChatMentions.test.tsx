import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatView } from '../ChatView';
import type { Mentionables } from '../useChatViewState';
import type { Channel, Message, Role, User } from '../../../types';

/** Menciones (#46): cómo se muestran, qué se resalta y el autocompletado de @. */

const users: Record<string, User> = {
  me: { id: 'me', username: 'mar', displayName: 'Mar', status: 'online' } as User,
  'auth0|ana': { id: 'auth0|ana', username: 'ana', displayName: 'Ana B', status: 'online' } as User,
};
const soporte = { id: 'r-sop', name: 'soporte', color: '#99aab5', permissions: [] } as Role;
const channel = { id: 'c1', name: 'general', type: 'text' } as Channel;
const none = { users: [], roles: [], everyone: false };

const msg = (id: string, content: string, mentions = none, authorId = 'auth0|ana') =>
  ({ id, authorId, content, mentions, timestamp: '2025-10-21T16:54:00', channelId: 'c1' }) as Message;

const mentionables = (extra: Partial<Mentionables> = {}): Mentionables => ({
  members: Object.values(users),
  roles: [soporte],
  canMentionEveryone: false,
  myRoleIds: [],
  ...extra,
});

const messageOf = (text: string) => screen.getByText(text, { exact: false }).closest('li')!;

describe('Menciones en el chat', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('muestra los tokens como @usuario y @rol, nunca el id', () => {
    render(
      <ChatView
        channel={channel}
        users={users}
        currentUserId="me"
        mentionables={mentionables()}
        messages={[msg('m1', 'hola <@auth0|ana> y <@&r-sop> fin', { ...none, users: ['auth0|ana'], roles: ['r-sop'] })]}
      />
    );

    expect(screen.getByRole('button', { name: '@ana' })).toBeTruthy();
    expect(screen.getByText('@soporte')).toBeTruthy();
    expect(screen.queryByText(/auth0\|ana|r-sop/)).toBeNull();
  });

  it('resalta el mensaje que me menciona directo, por @everyone o por un rol mío', () => {
    render(
      <ChatView
        channel={channel}
        users={users}
        currentUserId="me"
        mentionables={mentionables({ myRoleIds: ['r-sop'] })}
        messages={[
          msg('m1', 'directa <@me>', { ...none, users: ['me'] }),
          msg('m2', 'todos @everyone', { ...none, everyone: true }),
          msg('m3', 'rol <@&r-sop>', { ...none, roles: ['r-sop'] }),
          msg('m4', 'nada que ver'),
        ]}
      />
    );

    expect(messageOf('directa').className).toMatch(/mentioned/);
    expect(messageOf('todos').className).toMatch(/mentioned/);
    expect(messageOf('rol').className).toMatch(/mentioned/);
    expect(messageOf('nada que ver').className).not.toMatch(/mentioned/);
  });

  it('un @everyone que no notificó (sin permiso) es texto plano y no resalta (CA 4)', () => {
    render(
      <ChatView
        channel={channel}
        users={users}
        currentUserId="me"
        mentionables={mentionables()}
        messages={[msg('m1', 'atención @everyone')]}
      />
    );

    const item = messageOf('atención');
    expect(item.className).not.toMatch(/mentioned/);
    expect(item.textContent).toContain('atención @everyone');
    expect(item.querySelector('[class*="mention"]')).toBeNull();
  });

  it('el texto plano @nombre (mensajes viejos) ya no resalta', () => {
    render(
      <ChatView channel={channel} users={users} currentUserId="me" mentionables={mentionables()} messages={[msg('m1', 'hola @mar')]} />
    );

    expect(messageOf('hola').className).not.toMatch(/mentioned/);
  });

  it('autocompleta miembros con @ y envía el token', () => {
    const onSendMessage = vi.fn();
    render(
      <ChatView channel={channel} users={users} currentUserId="me" mentionables={mentionables()} messages={[]} onSendMessage={onSendMessage} />
    );
    const input = screen.getByRole('combobox');

    fireEvent.change(input, { target: { value: 'hola @an', selectionStart: 8 } });
    expect(screen.getByRole('option', { name: /@ana/ })).toBeTruthy();
    // Sin MENTION_EVERYONE no se ofrecen roles ni @everyone
    fireEvent.change(input, { target: { value: 'hola @', selectionStart: 6 } });
    expect(screen.queryByRole('option', { name: /@soporte/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /@everyone/ })).toBeNull();

    fireEvent.change(input, { target: { value: 'hola @an', selectionStart: 8 } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((input as HTMLInputElement).value).toBe('hola @ana ');

    fireEvent.change(input, { target: { value: 'hola @ana listo', selectionStart: 15 } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSendMessage).toHaveBeenCalledWith('hola <@auth0|ana> listo', undefined, undefined);
  });

  it('con MENTION_EVERYONE ofrece roles y @everyone, y se elige con las flechas', () => {
    const onSendMessage = vi.fn();
    render(
      <ChatView
        channel={channel}
        users={users}
        currentUserId="me"
        mentionables={mentionables({ canMentionEveryone: true })}
        messages={[]}
        onSendMessage={onSendMessage}
      />
    );
    const input = screen.getByRole('combobox');

    fireEvent.change(input, { target: { value: '@', selectionStart: 1 } });
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options.some((t) => t?.includes('@soporte'))).toBe(true);
    expect(options.some((t) => t?.includes('@everyone'))).toBe(true);

    fireEvent.change(input, { target: { value: '@sop', selectionStart: 4 } });
    fireEvent.keyDown(input, { key: 'Tab' });
    fireEvent.change(input, { target: { value: '@soporte y @e', selectionStart: 13 } });
    // Opciones: @soporte (tiene una "e") y @everyone; la flecha pasa a la segunda
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: /@everyone/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((input as HTMLInputElement).value).toBe('@soporte y @everyone ');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSendMessage).toHaveBeenCalledWith('<@&r-sop> y @everyone', undefined, undefined);
  });

  it('la vista previa de una respuesta muestra nombres, no tokens', () => {
    render(
      <ChatView
        channel={channel}
        users={users}
        currentUserId="me"
        mentionables={mentionables()}
        messages={[
          {
            ...msg('m2', 'respuesta'),
            replyTo: msg('m1', 'che <@me>', { ...none, users: ['me'] }),
          },
        ]}
      />
    );

    expect(screen.getByText(/che @mar/)).toBeTruthy();
  });
});
