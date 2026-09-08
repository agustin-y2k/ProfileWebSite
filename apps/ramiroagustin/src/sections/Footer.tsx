import { Container } from "@sites/ui";
import { Prosa, useIdioma } from "../i18n/contexto";
import { site } from "../data/site";
import styles from "./Footer.module.css";

export function Footer() {
  const { t } = useIdioma();

  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.copy}>
            © {__BUILD_YEAR__} · {site.name} · {t(site.location)}
          </p>
          {/* El colofón del sitio, reducido a una línea: ocupaba una sección
              entera que ahora usan los proyectos. */}
          <Prosa
            className={styles.note}
            frase={{
              es: `Esta página se compila a HTML estático y corre en una Raspberry Pi 4 en mi casa, detrás de un túnel de Cloudflare —sin puertos abiertos ni servidor alquilado—. <a class="${styles.inlineLink}" href="${site.repo}" target="_blank" rel="noopener noreferrer">Ver el código ↗</a>`,
              en: `This page compiles to static HTML and runs on a Raspberry Pi 4 at my house, behind a Cloudflare tunnel — no open ports and no rented server. <a class="${styles.inlineLink}" href="${site.repo}" target="_blank" rel="noopener noreferrer">View the code ↗</a>`,
            }}
          />
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
