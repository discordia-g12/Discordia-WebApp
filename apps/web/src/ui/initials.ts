/** Dos letras para un nombre sin imagen (avatar o ícono de servidor): las iniciales de dos palabras, o las dos primeras. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}
