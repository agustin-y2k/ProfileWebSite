import { useEffect, useState } from "react";
import { useMediaQuery } from "@sites/ui";
import { site } from "../data/site";
import styles from "./WhatsAppFab.module.css";

/**
 * Botón flotante de WhatsApp para pantallas chicas.
 *
 * En desktop el CTA del header está siempre visible, así que el flotante
 * sobra. En móvil el header no lo muestra y, sin esto, hay que scrollear
 * hasta contacto para encontrar cómo escribir.
 *
 * Se oculta cuando la sección de contacto entra en pantalla: ahí ya hay un
 * botón de WhatsApp grande, y dejarlo encima taparía justamente eso.
 */
export function WhatsAppFab() {
  const esMovil = useMediaQuery("(max-width: 51.99rem)");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!esMovil) {
      setVisible(false);
      return;
    }

    const contacto = document.getElementById("contacto");
    let contactoALaVista = false;
    let frame = 0;

    const actualizar = () => {
      // Aparece recién después del hero: arriba de todo el CTA principal ya
      // está a la vista y el flotante sería redundante.
      setVisible(window.scrollY > 500 && !contactoALaVista);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        actualizar();
        frame = 0;
      });
    };

    const observer = contacto
      ? new IntersectionObserver(
          ([entry]) => {
            contactoALaVista = entry?.isIntersecting ?? false;
            actualizar();
          },
          { threshold: 0.15 },
        )
      : null;

    if (contacto && observer) observer.observe(contacto);
    window.addEventListener("scroll", onScroll, { passive: true });
    actualizar();

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [esMovil]);

  if (!esMovil) return null;

  return (
    <a
      className={styles.fab}
      data-visible={visible || undefined}
      href={site.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-hidden={!visible}
      // Fuera del orden de tabulación mientras está oculto: si no, se puede
      // enfocar un botón invisible navegando con teclado.
      tabIndex={visible ? undefined : -1}
    >
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.03c-.25.69-1.44 1.32-1.99 1.4-.53.08-1.19.11-1.92-.12-.44-.14-1.01-.33-1.74-.64-3.06-1.32-5.06-4.4-5.21-4.6-.15-.2-1.25-1.66-1.25-3.17s.79-2.25 1.07-2.56c.28-.31.61-.38.81-.38.2 0 .41 0 .58.01.19.01.44-.07.69.53.25.6.86 2.11.94 2.26.08.15.13.33.02.53-.1.2-.16.33-.31.5-.15.18-.32.39-.46.53-.15.15-.31.32-.13.62.18.31.79 1.3 1.69 2.11 1.16 1.03 2.14 1.35 2.45 1.5.31.15.49.13.67-.08.18-.2.77-.9.98-1.21.2-.31.41-.26.69-.15.28.1 1.79.84 2.1.99.31.15.51.23.58.36.08.13.08.74-.17 1.43z" />
      </svg>
      <span className={styles.label}>Escribinos</span>
    </a>
  );
}
