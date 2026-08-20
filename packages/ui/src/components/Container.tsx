import type { ElementType, ReactNode } from "react";
import styles from "./Container.module.css";

type ContainerProps = {
  children: ReactNode;
  /** `narrow` para bloques de texto largo, donde 1120px rompe la lectura. */
  width?: "default" | "narrow" | "wide";
  as?: ElementType;
  className?: string;
};

export function Container({
  children,
  width = "default",
  as: Tag = "div",
  className,
}: ContainerProps) {
  return (
    <Tag
      className={[styles.container, styles[width], className].filter(Boolean).join(" ")}
    >
      {children}
    </Tag>
  );
}
