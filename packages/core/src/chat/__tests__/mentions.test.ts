import { describe, expect, it } from 'vitest';
import { encodeMentions, mentionsToText, mentionsUser, splitMentions, type MessageMentions } from '../mentions';

const none: MessageMentions = { users: [], roles: [], everyone: false };

describe('splitMentions', () => {
  it('parte el texto en usuarios, roles y @everyone', () => {
    const mentions = { users: ['auth0|ana'], roles: ['r1'], everyone: true };
    expect(splitMentions('hola <@auth0|ana>, <@&r1> y @everyone!', mentions)).toEqual([
      { type: 'text', text: 'hola ' },
      { type: 'user', id: 'auth0|ana' },
      { type: 'text', text: ', ' },
      { type: 'role', id: 'r1', active: true },
      { type: 'text', text: ' y ' },
      { type: 'everyone', active: true },
      { type: 'text', text: '!' },
    ]);
  });

  it('@everyone y roles que no notificaron quedan inactivos (CA 4)', () => {
    expect(splitMentions('@everyone <@&r1>', none)).toEqual([
      { type: 'everyone', active: false },
      { type: 'text', text: ' ' },
      { type: 'role', id: 'r1', active: false },
    ]);
    expect(splitMentions('@everyone')).toEqual([{ type: 'everyone', active: false }]);
  });

  it('@everyone solo como palabra suelta', () => {
    for (const text of ['mail@everyone', '@everyones', '@everyone-ish', '@@everyone']) {
      expect(splitMentions(text, { ...none, everyone: true })).toEqual([{ type: 'text', text }]);
    }
  });

  it('texto sin menciones, o con tokens mal formados, queda igual', () => {
    expect(splitMentions('hola @ana <@> <@ a>', none)).toEqual([{ type: 'text', text: 'hola @ana <@> <@ a>' }]);
    expect(splitMentions('', none)).toEqual([]);
  });
});

describe('mentionsUser', () => {
  it('directa, por @everyone o por un rol propio', () => {
    expect(mentionsUser({ ...none, users: ['me'] }, 'me')).toBe(true);
    expect(mentionsUser({ ...none, everyone: true }, 'me')).toBe(true);
    expect(mentionsUser({ ...none, roles: ['r1'] }, 'me', ['r1'])).toBe(true);
  });

  it('no si es a otro, a un rol ajeno o no hay menciones', () => {
    expect(mentionsUser({ ...none, users: ['other'] }, 'me')).toBe(false);
    expect(mentionsUser({ ...none, roles: ['r2'] }, 'me', ['r1'])).toBe(false);
    expect(mentionsUser(undefined, 'me')).toBe(false);
    expect(mentionsUser({ ...none, everyone: true }, '')).toBe(false);
  });
});

describe('encodeMentions', () => {
  it('pasa a tokens las menciones elegidas', () => {
    const picked = [
      { label: 'ana', token: '<@auth0|ana>' },
      { label: 'Equipo de soporte', token: '<@&r1>' },
    ];
    expect(encodeMentions('hola @ana y @Equipo de soporte!', picked)).toBe('hola <@auth0|ana> y <@&r1>!');
  });

  it('la etiqueta más larga gana y no toca palabras más largas ni mails', () => {
    const picked = [
      { label: 'ana', token: '<@a>' },
      { label: 'ana_b', token: '<@b>' },
    ];
    expect(encodeMentions('@ana_b @ana @anabel ana@ana.com', picked)).toBe('<@b> <@a> @anabel ana@ana.com');
  });

  it('escapa los caracteres especiales de la etiqueta', () => {
    expect(encodeMentions('@a.b @axb', [{ label: 'a.b', token: '<@x>' }])).toBe('<@x> @axb');
  });

  it('sin menciones elegidas devuelve el texto igual', () => {
    expect(encodeMentions('@everyone hola', [])).toBe('@everyone hola');
  });
});

describe('mentionsToText', () => {
  it('muestra los tokens como @nombre y @rol', () => {
    const names = { user: (id: string) => (id === 'auth0|ana' ? 'ana' : 'usuario'), role: () => 'soporte' };
    expect(mentionsToText('hola <@auth0|ana> <@&r1> @everyone, <@x>', names)).toBe('hola @ana @soporte @everyone, @usuario');
  });
});
