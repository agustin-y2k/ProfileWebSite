import type { AnchorHTMLAttributes, ButtonHTMLAttributes, JSX, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "soft" | "ghost";
type Size = "sm" | "md" | "lg";

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
};

type AsAnchor = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type AsButton = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };

/**
 * Un `href` convierte el botón en `<a>`; sin él, en `<button>`.
 * El tipo lo fuerza, así no se puede pedir un `<button href>` — que es
 * el error que rompe la navegación por teclado y el click derecho.
 */
export function Button(props: AsAnchor): JSX.Element;
export function Button(props: AsButton): JSX.Element;
export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: AsAnchor | AsButton) {
  const cls = [styles.btn, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");

  if ("href" in rest && rest.href) {
    const { href, target, ...anchorRest } =
      rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    // Cualquier link a otra pestaña lleva rel de seguridad sin tener que recordarlo.
    const rel = target === "_blank" ? "noopener noreferrer" : anchorRest.rel;
    return (
      <a className={cls} href={href} target={target} {...anchorRest} rel={rel}>
        {children}
      </a>
    );
  }

  const { type = "button", ...buttonRest } =
    rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={cls} type={type} {...buttonRest}>
      {children}
    </button>
  );
}
