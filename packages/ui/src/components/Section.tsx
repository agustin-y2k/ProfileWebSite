import type { ReactNode } from "react";
import styles from "./Section.module.css";

type SectionProps = {
  children: ReactNode;
  id?: string;
  /** `alt` aplica el fondo alternado que separa secciones contiguas. */
  tone?: "default" | "alt";
  /** Espaciado vertical. `tight` para bandas, `loose` para secciones ancla. */
  space?: "default" | "tight" | "loose";
  labelledBy?: string;
  className?: string;
};

export function Section({
  children,
  id,
  tone = "default",
  space = "default",
  labelledBy,
  className,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={[styles.section, styles[tone], styles[space], className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}
