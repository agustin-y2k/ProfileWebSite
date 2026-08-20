import type { ReactNode } from "react";
import styles from "./Card.module.css";

type CardProps = {
  children: ReactNode;
  /** Con `href` la tarjeta entera es un link; el `::after` cubre la superficie. */
  href?: string;
  badge?: string;
  className?: string;
};

export function Card({ children, href, badge, className }: CardProps) {
  const cls = [styles.card, href && styles.interactive, className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {badge ? <span className={styles.badge}>{badge}</span> : null}
      {children}
    </>
  );

  return href ? (
    <a className={cls} href={href}>
      {content}
    </a>
  ) : (
    <div className={cls}>{content}</div>
  );
}
