import { useEffect, useState } from "react";
import { Container, useLockBodyScroll, useScrolled, useScrollSpy } from "@sites/ui";
import { navItems, sectionIds, site } from "../data/site";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.css";

export function Header() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(16);
  const active = useScrollSpy(sectionIds);

  useLockBodyScroll(open);

  // Escape cierra el menú: quien lo abrió con teclado tiene que poder salir
  // sin buscar el botón de cerrar.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header
      className={[styles.header, scrolled && styles.scrolled].filter(Boolean).join(" ")}
    >
      <Container className={styles.inner}>
        <a className={styles.logo} href="#top">
          <span className={styles.logoMark} aria-hidden="true">
            RA
          </span>
          <span className={styles.logoText}>
            Ramiro <span className={styles.logoLast}>Agustín</span>
          </span>
        </a>

        <nav className={styles.nav} aria-label="Principal">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={styles.navLink}
              aria-current={active === item.id ? "true" : undefined}
            >
              {item.label}
            </a>
          ))}
          <a
            className={styles.navExternal}
            href={site.bytefix}
            target="_blank"
            rel="noopener noreferrer"
          >
            ByteFix
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path
                d="M7 17L17 7M17 7H9M17 7v8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </a>
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((value) => !value)}
          >
            <span
              className={[styles.bar, open && styles.barTop].filter(Boolean).join(" ")}
            />
            <span
              className={[styles.bar, open && styles.barMid].filter(Boolean).join(" ")}
            />
            <span
              className={[styles.bar, open && styles.barBot].filter(Boolean).join(" ")}
            />
          </button>
        </div>
      </Container>

      <div
        id="menu-movil"
        className={styles.drawer}
        data-open={open || undefined}
        // `inert` saca del orden de tabulación todo el menú cerrado, sin
        // tener que gestionar tabindex elemento por elemento.
        inert={!open}
      >
        <Container>
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={styles.drawerLink}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a
            className={styles.drawerLink}
            href={site.bytefix}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            ByteFix ↗
          </a>
        </Container>
      </div>
    </header>
  );
}
