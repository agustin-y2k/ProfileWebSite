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
 * El contenido se sirve visible en el HTML: la clase que lo oculta vive bajo
 * `html.js`, y esa clase la pone un script inline en el <head>. Si el JS falla
 * o no llega, la página se lee igual — que es justo lo que pasa hoy con el
 * IntersectionObserver imperativo, donde un error deja todo en opacity: 0.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[styles.reveal, className].filter(Boolean).join(" ")}
      data-visible={visible || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
