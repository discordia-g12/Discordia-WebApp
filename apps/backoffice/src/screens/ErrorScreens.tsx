import { ActionLink, BlockButton, ErrorPage } from '@web/ui';
import { DEFAULT_SECTION, SECTIONS, navigate, pathForSection } from '../routes';

const BRAND = 'discordia/ staff';
const defaultLabel = SECTIONS.find((s) => s.id === DEFAULT_SECTION)?.label ?? 'Usuarios';

/** Una ruta que no es de ninguna sección: se dice, en vez de llevar a usuarios sin avisar. */
export function NotFoundScreen() {
  return (
    <ErrorPage
      code="404"
      title="Página no encontrada"
      brand={BRAND}
      message="Esta dirección no es de ninguna sección del backoffice. Puede que el link esté mal copiado."
    >
      <BlockButton size="large" onPress={() => navigate(pathForSection(DEFAULT_SECTION))}>
        {`Ir a ${defaultLabel}`}
      </BlockButton>
    </ErrorPage>
  );
}

/**
 * La interfaz falló al dibujarse (ErrorBoundary de main.tsx). El token vive en memoria, así que recargar
 * puede pedir entrar de nuevo (con Google vuelve solo). El detalle técnico, solo en desarrollo.
 */
export function CrashScreen({ error }: { error: Error }) {
  return (
    <ErrorPage
      title="Algo falló"
      brand={BRAND}
      message="Se rompió algo en la pantalla y no pudimos seguir mostrándola. Recargá para volver; si se repite, avisá al equipo."
      detail={import.meta.env.DEV ? error.message : undefined}
    >
      <BlockButton size="large" onPress={() => window.location.reload()}>
        Recargar
      </BlockButton>
      <ActionLink onPress={() => window.location.assign('/')}>ir al inicio</ActionLink>
    </ErrorPage>
  );
}
