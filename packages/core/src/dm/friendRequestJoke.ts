const FRIEND_REQUEST_JOKES = [
  'como en la salita de 4, pero sin tener que convidarle plasticola.',
  'primer día en FIUBA: no conocés a nadie y te guardaron un lugar en el aula.',
  'te eligió para el equipo antes del recreo.',
  'busca compañero de TP. o amigo. lo que venga primero.',
];

/** El chiste de una solicitud de amistad. Sale del id, así no cambia entre renders ni entre web y mobile. */
export function friendRequestJoke(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return FRIEND_REQUEST_JOKES[hash % FRIEND_REQUEST_JOKES.length];
}

/** El título de la tarjeta de una solicitud de amistad. */
export function friendRequestTitle(displayName: string): string {
  return `${displayName} quiere ser tu amigo`;
}
