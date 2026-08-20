import { Container } from "@sites/ui";
import { site } from "../data/site";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <p className={styles.copy}>
          © {__BUILD_YEAR__} · {site.name} · {site.city}, {site.region}
        </p>
        <a
          className={styles.link}
          href={site.ownerSite}
          target="_blank"
          rel="noopener noreferrer"
        >
          Por {site.owner} ↗
        </a>
      </Container>
    </footer>
  );
}
