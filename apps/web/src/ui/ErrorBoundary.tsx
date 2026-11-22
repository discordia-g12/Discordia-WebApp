import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Lo que se muestra en lugar de lo que falló (por ejemplo, una ErrorPage con "Recargar"). */
  fallback: (error: Error) => ReactNode;
  /** Para registrar el error (consola, y más adelante un servicio de errores). */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Atrapa un error al dibujar lo de adentro y muestra `fallback` en vez de la pantalla en blanco. Es una
 * clase porque React solo atrapa errores de render con getDerivedStateFromError / componentDidCatch. No
 * atrapa errores de eventos ni de promesas: esos los muestra cada pantalla (avisos, reintentar).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render(): ReactNode {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}
