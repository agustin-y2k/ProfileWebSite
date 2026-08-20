import type { ElementType, ReactNode } from "react";
import styles from "./VisuallyHidden.module.css";

/** Texto para lectores de pantalla que no ocupa espacio visual. */
export function VisuallyHidden({
  children,
  as: Tag = "span",
}: {
  children: ReactNode;
  as?: ElementType;
}) {
  return <Tag className={styles.hidden}>{children}</Tag>;
}
