import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Monta un diálogo (Modal, ConfirmDialog) directo en <body>. Modal usa position: fixed para cubrir la pantalla,
 * pero las celdas tienen una animación de entrada con transform, y un transform hace que los fixed de adentro
 * se ubiquen relativos a la celda: el diálogo quedaba metido en su ancho. Afuera de la celda no pasa.
 */
export function DialogPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
