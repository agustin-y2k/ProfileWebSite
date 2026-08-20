import { Button, Container } from "@sites/ui";
import { site } from "../data/site";
import { WhatsAppButton } from "../components/WhatsAppButton";
import styles from "./Hero.module.css";

const trust = [
  { title: "En taller o a domicilio", note: `${site.city}, ${site.region}` },
  { title: "Diagnóstico primero", note: "Te confirmo el precio antes de empezar" },
  { title: "Hardware y software", note: "Desde microsoldadura hasta scripts" },
];

export function Hero() {
  return (
    <section className={styles.hero} id="top">
      <Container className={styles.inner}>
        <p className="label">Taller de informática y software</p>

        <h1 className={styles.title}>
          Tecnología que <span className={styles.accent}>funciona bien</span>.
        </h1>

        <p className={styles.lead}>
          Desbloqueo de notebooks del gobierno, reparación de hardware a nivel de placa y
          desarrollo de software a medida. En {site.city}, {site.region}.
        </p>

        <div className={styles.actions}>
          <WhatsAppButton href={site.whatsapp} size="lg">
            Escribir por WhatsApp
          </WhatsAppButton>
          <Button href="#precios" variant="soft" size="lg">
            Ver tarifas
          </Button>
        </div>

        <ul className={styles.trust}>
          {trust.map((item) => (
            <li key={item.title} className={styles.trustItem}>
              <svg
                className={styles.check}
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden="true"
                fill="none"
              >
                <path
                  d="M4.5 12.5l5 5 10-11"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>
                <strong className={styles.trustTitle}>{item.title}</strong>
                <span className={styles.trustNote}>{item.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
