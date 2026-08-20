import { useCallback, useEffect, useState } from "react";

export type Theme = "claro" | "oscuro";

const STORAGE_KEY = "tema";

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "claro" || value === "oscuro" ? value : null;
  } catch {
    return null; // modo incógnito o storage bloqueado
  }
}

/**
 * Tema claro/oscuro con persistencia.
 *
 * Arranca en `null` a propósito: durante el prerender no hay `localStorage`
 * ni `matchMedia`, y devolver un valor inventado haría que el servidor y el
 * cliente rendericen etiquetas distintas. El tema real se resuelve tras
 * montar; el flash lo previene el script inline del <head>, no este hook.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      setTheme(stored);
      return;
    }

    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(dark.matches ? "oscuro" : "claro");

    // Si nunca eligió explícitamente, seguir al sistema cuando cambie.
    const onChange = (event: MediaQueryListEvent) => {
      if (!readStoredTheme()) setTheme(event.matches ? "oscuro" : "claro");
    };
    dark.addEventListener("change", onChange);
    return () => dark.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "oscuro" ? "claro" : "oscuro";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* sin persistencia, pero el cambio en pantalla igual se aplica */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
