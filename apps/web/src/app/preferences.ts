import { create } from 'zustand';

/**
 * Preferencias de este navegador (Ajustes de usuario → Notificación, Voz y Experiencia). No van al backend:
 * son del dispositivo (los parlantes de una notebook no son los de otra), como el tema (ui/theme.ts).
 * Se guardan en localStorage; si está bloqueado, valen solo para esta visita.
 */

export type MessageMode = 'cozy' | 'compact';

export interface Preferences {
  /** Aviso del sistema con la pestaña abierta pero sin foco (si este navegador no tiene push activo). */
  desktopNotifications: boolean;
  /** Avisos sin leer en el título de la pestaña (y en el ícono, si la app está instalada). */
  unreadBadge: boolean;
  /** Un sonido corto cuando llega un aviso. */
  sounds: boolean;
  /** En los avisos de escritorio, el comienzo del mensaje; sin esto solo dónde pasó. */
  notificationPreview: boolean;
  /** deviceId de enumerateDevices(); 'default' es el del sistema. */
  inputDeviceId: string;
  outputDeviceId: string;
  /** Volumen de los demás en una llamada, de 0 a 100. */
  outputVolume: number;
  messageMode: MessageMode;
  /** Tamaño de la letra de los mensajes, en px. */
  chatFontSize: number;
}

export const CHAT_FONT_SIZE_MIN = 12;
export const CHAT_FONT_SIZE_MAX = 20;

export const DEFAULT_PREFERENCES: Preferences = {
  desktopNotifications: true,
  unreadBadge: true,
  sounds: true,
  notificationPreview: true,
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  outputVolume: 100,
  messageMode: 'cozy',
  // El de --font-body-size de @discordia/tokens
  chatFontSize: 15,
};

const STORAGE_KEY = 'discordia_preferences';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

/** Lo guardado, completado con los valores por defecto: un valor roto o de otra versión no rompe nada. */
export function sanitizePreferences(raw: unknown): Preferences {
  const saved = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Preferences, unknown>>;
  const bool = (key: keyof Preferences) => (typeof saved[key] === 'boolean' ? (saved[key] as boolean) : (DEFAULT_PREFERENCES[key] as boolean));
  const text = (key: keyof Preferences) => (typeof saved[key] === 'string' && saved[key] ? (saved[key] as string) : (DEFAULT_PREFERENCES[key] as string));
  const number = (key: keyof Preferences, min: number, max: number) =>
    typeof saved[key] === 'number' && Number.isFinite(saved[key]) ? clamp(saved[key] as number, min, max) : (DEFAULT_PREFERENCES[key] as number);

  return {
    desktopNotifications: bool('desktopNotifications'),
    unreadBadge: bool('unreadBadge'),
    sounds: bool('sounds'),
    notificationPreview: bool('notificationPreview'),
    inputDeviceId: text('inputDeviceId'),
    outputDeviceId: text('outputDeviceId'),
    outputVolume: number('outputVolume', 0, 100),
    messageMode: saved.messageMode === 'compact' ? 'compact' : 'cozy',
    chatFontSize: number('chatFontSize', CHAT_FONT_SIZE_MIN, CHAT_FONT_SIZE_MAX),
  };
}

function load(): Preferences {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    return sanitizePreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function save(preferences: Preferences) {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage lleno o bloqueado: la preferencia vale hasta recargar
  }
}

interface PreferencesState extends Preferences {
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

export const usePreferences = create<PreferencesState>((set, get) => ({
  ...load(),
  setPreference: (key, value) => {
    set({ [key]: value } as Pick<Preferences, typeof key>);
    save(getPreferences(get()));
  },
}));

/** Las preferencias sin las funciones del store (para leerlas fuera de React). */
export function getPreferences(state: PreferencesState = usePreferences.getState()): Preferences {
  return sanitizePreferences(state);
}

/** El tamaño de letra del chat va en una variable de <html>: la usan ChatView y los hilos. */
function applyChatFontSize(size: number) {
  document.documentElement.style.setProperty('--chat-font-size', `${size}px`);
}

/** Aplica lo que es de toda la página al arrancar y cada vez que cambia. */
export function initPreferences() {
  applyChatFontSize(usePreferences.getState().chatFontSize);
  usePreferences.subscribe((state, previous) => {
    if (state.chatFontSize !== previous.chatFontSize) applyChatFontSize(state.chatFontSize);
  });
}
