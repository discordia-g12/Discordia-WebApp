/** Espaciado (escala de 4 px), líneas, bordes y medidas de la grilla del rediseño. */

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
} as const;

export type SpaceStep = keyof typeof space;

/** Grosores, en px. */
export const lines = {
  /** Divisorias de la grilla. */
  hairline: 1,
  /** Contorno de foco (accesibilidad). */
  focus: 2,
  /** Subrayado de la pestaña activa. */
  underline: 3,
  /** Borde izquierdo de los toasts de error. */
  accent: 4,
} as const;

/** Sin bordes redondeados: la profundidad la dan las líneas y el contraste, no las formas. */
export const radius = 0;

/** Medidas fijas de la grilla en desktop (PDF, artboard de 1440 px). */
export const layout = {
  /** Rail de servidores (franjas). */
  railWidth: 68,
  /** Columna izquierda: DMs o canales, con la marca de agua al pie. */
  sidebarWidth: 352,
  /** Columna derecha ("ACTIVO AHORA", miembros). */
  asideWidth: 220,
  /** Barra de usuario negra. */
  userBarHeight: 56,
  /** Lado de los avatares cuadrados. */
  avatarSize: { sm: 24, md: 40, lg: 80 },
  /** Alto de las franjas de servidor del rail. */
  serverStripHeight: 24,
} as const;

/** Por debajo de este ancho, la web usa el layout mobile (MobileShell). */
export const breakpoints = {
  mobile: 768,
} as const;
