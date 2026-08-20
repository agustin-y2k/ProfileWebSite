import { VisuallyHidden } from "@sites/ui";
import { useTheme } from "../hooks/useTheme";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  // Antes de montar el tema es desconocido: se rinde el botón con el icono
  // neutro y sin anunciar un estado que podría ser el equivocado.
  const label =
    theme === null
      ? "Cambiar tema"
      : theme === "oscuro"
        ? "Cambiar a tema claro"
        : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <span className={styles.icons} aria-hidden="true">
        <svg
          className={styles.sun}
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
        >
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 2.8v2.4M12 18.8v2.4M4.7 4.7l1.7 1.7M17.6 17.6l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.7 19.3l1.7-1.7M17.6 6.4l1.7-1.7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <svg
          className={styles.moon}
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
        >
          <path
            d="M20 14.2A8.2 8.2 0 019.8 4a8.2 8.2 0 1 0 10.2 10.2z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <VisuallyHidden>{label}</VisuallyHidden>
    </button>
  );
}
