import { useEffect, useState } from "react";
import { Container, useLockBodyScroll, useScrolled, useScrollSpy } from "@sites/ui";
import { navItems, sectionIds, site } from "../data/site";
import { Logo } from "./Logo";
import { WhatsAppButton } from "./WhatsAppButton";
import styles from "./Header.module.css";

export function Header() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(20);
  const active = useScrollSpy(sectionIds);

  useLockBodyScroll(open);

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
        <Logo />

        <nav className={styles.nav} aria-label="Principal">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={styles.link}
              aria-current={active === item.id ? "true" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <WhatsAppButton href={site.whatsapp} size="sm" className={styles.cta}>
            WhatsApp
          </WhatsAppButton>

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
        </Container>
      </div>
    </header>
  );
}
