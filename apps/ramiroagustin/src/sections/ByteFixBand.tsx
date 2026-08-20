import { Button, Container, Section } from "@sites/ui";
import { site } from "../data/site";
import styles from "./ByteFixBand.module.css";

/** Puente al sitio comercial. La marca ByteFix mantiene su cian propio
 *  incluso dentro del tema cálido de este sitio: es otra identidad. */
export function ByteFixBand() {
  return (
    <Section space="tight" labelledBy="bytefix-titulo">
      <Container>
        <div className={styles.band}>
          <span className={styles.mark} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <rect
                x="3"
                y="5"
                width="18"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8 21h8M12 17v4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <div className={styles.text}>
            <h2 id="bytefix-titulo" className={styles.title}>
              ByteFix
            </h2>
            <p className={styles.desc}>
              Mi taller de <strong>reparación de computadoras</strong> y soporte a
              clientes. Ahí están las tarifas, los servicios y el WhatsApp; esta página es
              solo presentación personal.
            </p>
          </div>

          <Button href={site.bytefix} target="_blank" className={styles.cta}>
            Ir a ByteFix
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M7 17L17 7M17 7H9M17 7v8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
