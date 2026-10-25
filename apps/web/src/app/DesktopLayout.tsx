import { AppShell } from './AppShell';
import { FullScreenViews } from './FullScreenViews';

/** Escritorio: la grilla rail / barra lateral / contenido y, encima, ajustes y perfil como cortina. */
export function DesktopLayout() {
  return (
    <>
      <AppShell />
      <FullScreenViews />
    </>
  );
}
