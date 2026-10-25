interface LogoProps {
  /** Alto en px. */
  size?: number;
  className?: string;
}

/**
 * La "D" geométrica de Discordia (assets/logo.svg). Toma el color del texto (currentColor), así se
 * invierte sola en el modo oscuro y sobre los bloques negros.
 */
export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      viewBox="22.47 13.38 22.47 21.23"
      height={size}
      width={(size * 22.47) / 21.23}
      fill="currentColor"
      role="img"
      aria-label="Discordia"
      className={className}
    >
      <polygon points="40.81 13.4 44.94 18.88 44.91 28.88 40.81 34.61 22.47 34.61 22.47 24.96 42.85 24.96 42.85 23.58 22.47 23.58 22.47 13.38" />
    </svg>
  );
}
