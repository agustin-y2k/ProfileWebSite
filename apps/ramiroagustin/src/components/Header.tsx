import { useEffect, useState } from "react";
import { Container, useLockBodyScroll, useScrolled, useScrollSpy } from "@sites/ui";
import { useIdioma } from "../i18n/contexto";
import { CV } from "../i18n/meta";
import { navItems, sectionIds, site } from "../data/site";
import { SelectorIdioma } from "./SelectorIdioma";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.css";

export function Header() {
  const { idioma, t } = useIdioma();
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

        <nav className={styles.nav} aria-label={t({ es: "Principal", en: "Main" })}>
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={styles.navLink}
              aria-current={active === item.id ? "true" : undefined}
            >
              {t(item.label)}
            </a>
          ))}
          <a className={styles.navCv} href={CV[idioma]}>
            CV
          </a>
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
          <SelectorIdioma pagina="inicio" />
          <ThemeToggle />
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={
              open
                ? t({ es: "Cerrar menú", en: "Close menu" })
                : t({ es: "Abrir menú", en: "Open menu" })
            }
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
              {t(item.label)}
            </a>
          ))}
          <a
            className={styles.drawerLink}
            href={CV[idioma]}
            onClick={() => setOpen(false)}
          >
            CV
          </a>
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
