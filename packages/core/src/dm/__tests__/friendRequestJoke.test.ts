import { describe, it, expect } from 'vitest';
import { friendRequestJoke, friendRequestTitle } from '../friendRequestJoke';

describe('friendRequestJoke', () => {
  it('es determinístico', () => {
    expect(friendRequestJoke('fr-123')).toBe(friendRequestJoke('fr-123'));
  });

  it('funciona con cualquier id y va variando', () => {
    const jokes = new Set(Array.from({ length: 40 }, (_, i) => friendRequestJoke(`550e8400-e29b-41d4-a716-${i}`)));

    expect(jokes.size).toBeGreaterThan(1);
    expect(friendRequestJoke('')).toEqual(expect.any(String));
    for (const joke of jokes) expect(joke).toEqual(expect.any(String));
  });
});

describe('friendRequestTitle', () => {
  it('nombra a quien la mandó', () => {
    expect(friendRequestTitle('Sofía')).toBe('Sofía quiere ser tu amigo');
  });
});
