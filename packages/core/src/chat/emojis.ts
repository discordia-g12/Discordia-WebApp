/**
 * Catálogo de emojis para reacciones rápidas y selector clasificado.
 * Diseñado para admitir en el futuro catálogo completo Unicode (p. ej. emoji-mart)
 * y emojis personalizados de servidor (HU 75).
 */

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
  description?: string;
  isPlaceholder?: boolean;
}

/** Emojis rápidos (4) mostrados en la barra de hover del mensaje (Web) o fila superior de long-press (Mobile). */
export const QUICK_EMOJIS: readonly string[] = ['👍', '❤️', '😂', '🔥'];

/** Emojis populares / frecuentes (32) para selección rápida en el picker. */
export const POPULAR_EMOJIS: readonly string[] = [
  '👍', '❤️', '😂', '🔥', '🎉', '👏', '✨', '🚀',
  '👀', '💯', '🙏', '😍', '🤔', '🙌', '😢', '💀',
  '😭', '😎', '🥳', '🤯', '🤝', '💪', '🤩', '💡',
  '✅', '❌', '⭐', '🎈', '🍕', '🍻', '☕', '😴',
];

export const EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  {
    id: 'frequent',
    name: 'Frecuentes / Populares',
    icon: '🕒',
    emojis: [...POPULAR_EMOJIS],
  },
  {
    id: 'people',
    name: 'Caritas y Emociones',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯',
      '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
      '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
      '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
      '💀', '💩', '🤡', '👻', '👽', '🤖',
    ],
  },
  {
    id: 'gestures',
    name: 'Gestos y Personas',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
      '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
      '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊',
      '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
      '✍️', '💪', '👀', '👁️', '🧠', '🫀', '🫁', '🦴',
    ],
  },
  {
    id: 'symbols',
    name: 'Objetos y Símbolos',
    icon: '💡',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤',
      '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟', '🔥', '✨', '🎉', '🎊', '🎈',
      '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '💫',
      '⚡', '💡', '💥', '💯', '✅', '❌', '⚠️', '🚫',
      '🚀', '🍕', '🍔', '🍟', '🍻', '🍺', '☕', '🍹',
    ],
  },
  {
    id: 'server',
    name: 'Servidor',
    icon: '🏷️',
    emojis: [],
    description: 'Próximamente: emojis personalizados del servidor',
    isPlaceholder: true,
  },
];
