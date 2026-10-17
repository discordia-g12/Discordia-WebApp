import type { Category } from '../types';

/**
 * Disposición de canales en categorías (funciones puras, compartidas por web y mobile).
 *
 * El backend guarda una posición global por canal y otra por categoría; el cliente agrupa los
 * canales bajo su categoría respetando ese orden. Las categorías locales (la sección general de
 * canales sin categoría) no existen en el backend y siempre van primero.
 */

/** Prefijo de las categorías que arma el cliente (p. ej. la sección general); no existen en el backend. */
export const LOCAL_CATEGORY_PREFIX = 'cat-';

/** true si la categoría es local (sección general): al backend se le manda "sin categoría". */
export function isLocalCategoryId(categoryId: string): boolean {
  return categoryId.startsWith(LOCAL_CATEGORY_PREFIX);
}

/** category_id para el backend: null/undefined o una categoría local equivalen a "sin categoría". */
export function toBackendCategoryId(categoryId: string | null | undefined): string | null {
  return categoryId && !isLocalCategoryId(categoryId) ? categoryId : null;
}

/**
 * Mueve un canal a `targetCategoryId`, justo antes de `beforeChannelId` (o al final si es null).
 * Devuelve las categorías nuevas, o las mismas si el movimiento no aplica.
 */
export function moveChannel(
  categories: Category[],
  channelId: string,
  targetCategoryId: string,
  beforeChannelId: string | null
): Category[] {
  const channel = categories.flatMap((c) => c.channels).find((ch) => ch.id === channelId);
  if (!channel || channelId === beforeChannelId) return categories;
  if (!categories.some((c) => c.id === targetCategoryId)) return categories;

  const moved = { ...channel, categoryId: toBackendCategoryId(targetCategoryId) ?? undefined };

  return categories.map((category) => {
    const channels = category.channels.filter((ch) => ch.id !== channelId);
    if (category.id !== targetCategoryId) {
      return channels.length === category.channels.length ? category : { ...category, channels };
    }
    const index = beforeChannelId ? channels.findIndex((ch) => ch.id === beforeChannelId) : -1;
    channels.splice(index === -1 ? channels.length : index, 0, moved);
    return { ...category, channels };
  });
}

/**
 * Mueve una categoría justo antes de `beforeCategoryId` (o al final si es null).
 * Las categorías locales no se mueven y quedan siempre al principio.
 */
export function moveCategory(
  categories: Category[],
  categoryId: string,
  beforeCategoryId: string | null
): Category[] {
  const category = categories.find((c) => c.id === categoryId);
  if (!category || isLocalCategoryId(categoryId) || categoryId === beforeCategoryId) return categories;

  const locals = categories.filter((c) => isLocalCategoryId(c.id));
  const rest = categories.filter((c) => !isLocalCategoryId(c.id) && c.id !== categoryId);
  const index = beforeCategoryId ? rest.findIndex((c) => c.id === beforeCategoryId) : -1;
  rest.splice(index === -1 ? rest.length : index, 0, category);
  return [...locals, ...rest];
}

/**
 * Sube (-1) o baja (+1) un canal un lugar. En el borde de su categoría pasa a la vecina:
 * al subir el primero queda último de la anterior; al bajar el último, primero de la siguiente.
 */
export function shiftChannel(categories: Category[], channelId: string, direction: -1 | 1): Category[] {
  const categoryIndex = categories.findIndex((c) => c.channels.some((ch) => ch.id === channelId));
  if (categoryIndex === -1) return categories;
  const channels = categories[categoryIndex].channels;
  const index = channels.findIndex((ch) => ch.id === channelId);

  if (direction === -1) {
    if (index > 0) return moveChannel(categories, channelId, categories[categoryIndex].id, channels[index - 1].id);
    const previous = categories[categoryIndex - 1];
    return previous ? moveChannel(categories, channelId, previous.id, null) : categories;
  }

  if (index < channels.length - 1) {
    return moveChannel(categories, channelId, categories[categoryIndex].id, channels[index + 2]?.id ?? null);
  }
  const next = categories[categoryIndex + 1];
  return next ? moveChannel(categories, channelId, next.id, next.channels[0]?.id ?? null) : categories;
}

/** Sube (-1) o baja (+1) una categoría real un lugar (las locales no se mueven). */
export function shiftCategory(categories: Category[], categoryId: string, direction: -1 | 1): Category[] {
  const real = categories.filter((c) => !isLocalCategoryId(c.id));
  const index = real.findIndex((c) => c.id === categoryId);
  if (index === -1) return categories;
  if (direction === -1) {
    return index > 0 ? moveCategory(categories, categoryId, real[index - 1].id) : categories;
  }
  return index < real.length - 1 ? moveCategory(categories, categoryId, real[index + 2]?.id ?? null) : categories;
}

/** Orden completo de canales para PUT /channels/order: todos, en el orden en que se muestran. */
export function toChannelOrder(categories: Category[]): { id: string; category_id: string | null }[] {
  return categories.flatMap((category) =>
    category.channels.map((channel) => ({ id: channel.id, category_id: toBackendCategoryId(category.id) }))
  );
}

/** Orden completo de categorías para PUT /categories/order (sin las locales). */
export function toCategoryOrder(categories: Category[]): string[] {
  return categories.filter((c) => !isLocalCategoryId(c.id)).map((c) => c.id);
}
