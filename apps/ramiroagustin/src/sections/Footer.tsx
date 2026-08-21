import { Container } from "@sites/ui";
import { site } from "../data/site";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.copy}>
            © {__BUILD_YEAR__} · {site.name} · {site.location}
          </p>
          {/* El colofón del sitio, reducido a una línea: ocupaba una sección
              entera que ahora usan los proyectos. */}
          <p className={styles.note}>
            Esta página se compila a HTML estático y corre en una Raspberry Pi 4 en mi
            casa, detrás de un túnel de Cloudflare —sin puertos abiertos ni servidor
            alquilado—.{" "}
            <a
              className={styles.inlineLink}
              href={site.repo}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver el código ↗
            </a>
          </p>
        </div>
        <a
          className={styles.link}
          href={site.bytefix}
          target="_blank"
          rel="noopener noreferrer"
        >
          ByteFix ↗
        </a>
      </Container>
    </footer>
  );
}
