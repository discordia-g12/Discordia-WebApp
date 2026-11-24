import { ActionLink, BlockButton, ErrorPage } from '../ui';

const goHome = () => window.location.assign('/');

/** Una URL que la web no conoce (link roto o mal copiado): no se abre la app, se dice qué pasó. */
export function NotFoundScreen() {
  return (
    <ErrorPage
      code="404"
      title="Página no encontrada"
      message="Esta dirección no existe en Discordia. Puede que el link esté mal copiado o que la página ya no esté."
    >
      <BlockButton size="large" onPress={goHome}>
        Ir a Discordia
      </BlockButton>
    </ErrorPage>
  );
}

/**
 * La interfaz falló al dibujarse (ErrorBoundary de main.tsx). Recargar vuelve a armar todo desde cero: la
 * sesión sigue, así que se vuelve a entrar sin la contraseña. El detalle técnico, solo en desarrollo.
 */
export function CrashScreen({ error }: { error: Error }) {
  return (
    <ErrorPage
      title="Algo falló"
      message="Se rompió algo en la pantalla y no pudimos seguir mostrándola. Recargá para volver a donde estabas; si se repite, avisanos."
      detail={import.meta.env.DEV ? error.message : undefined}
    >
      <BlockButton size="large" onPress={() => window.location.reload()}>
        Recargar
      </BlockButton>
      <ActionLink onPress={goHome}>volver al inicio</ActionLink>
    </ErrorPage>
  );
}
