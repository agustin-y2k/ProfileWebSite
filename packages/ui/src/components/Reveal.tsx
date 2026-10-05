import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Reveal.module.css";

type RevealProps = {
  children: ReactNode;
  /** Escalona la entrada de una grilla: `delay={i * 60}`. */
  delay?: number;
  className?: string;
};

/**
 * Entrada al hacer scroll, con mejora progresiva.
 *
 * El HTML se sirve visible. Solo se oculta después de montar y registrar el
 * observador: si el JavaScript no llega, el contenido sigue siendo legible.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // El umbral va en cero y la entrada la decide el `rootMargin`. Un umbral
      // expresado como fracción del elemento es una trampa para los altos: el
      // máximo que puede alcanzar es ventana/elemento, así que cualquiera más
      // alto que unas ocho ventanas no llega nunca a 0,12 y se queda invisible
      // para siempre. Le pasó a la tarjeta de un proyecto cuando creció a
      // 7500 px —el techo era 0,108— y no hay nada en pantalla que lo delate:
      // simplemente no aparece.
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    setReady(true);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[styles.reveal, className].filter(Boolean).join(" ")}
      data-visible={visible || undefined}
      data-reveal-ready={ready || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
