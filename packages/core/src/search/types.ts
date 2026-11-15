import type { Message } from '../types';

/** Largo máximo del término que acepta Chat-Engine (ADR-04 de Chat-Engine-Service). */
export const MESSAGE_SEARCH_MAX_LENGTH = 100;

/** Resultados por página. Chat-Engine acepta hasta 50. */
export const MESSAGE_SEARCH_PAGE_SIZE = 25;

export interface MessageSearchQuery {
  /** Texto que tiene que contener el mensaje (sin distinguir mayúsculas ni tildes). */
  query?: string;
  /** Solo mensajes de este usuario. */
  authorId?: string;
  /** nextCursor de la página anterior. */
  before?: string;
  limit?: number;
}

export interface MessageSearchPage {
  /** Del más nuevo al más viejo. Vacío si no hay coincidencias. */
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}
