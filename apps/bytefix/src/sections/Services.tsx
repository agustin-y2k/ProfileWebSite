import { Card, Container, Reveal, Section } from "@sites/ui";
import { services } from "../data/services";
import styles from "./Services.module.css";

export function Services() {
  return (
    <Section id="servicios" labelledBy="servicios-titulo">
      <Container>
        <header className={styles.head}>
          <p className="label">Servicios</p>
          <h2 id="servicios-titulo" className={styles.title}>
            Qué hacemos
          </h2>
          <p className={styles.intro}>
            Tocá cualquier servicio para ver su tarifa de referencia.
          </p>
        </header>

        <ul className={styles.grid}>
          {services.map((service, i) => (
            <li key={service.id}>
              <Reveal delay={Math.min(i, 5) * 60}>
                {/* El link apunta a la fila de la tabla de precios. Es un ancla
                    real: funciona sin JS y se puede compartir el enlace. */}
                <Card
                  href={`#tarifa-${service.id}`}
                  badge={service.badge}
                  className={styles.card}
                >
                  <h3 className={styles.cardTitle}>{service.title}</h3>
                  <p className={styles.cardText}>{service.description}</p>
                  <span className={styles.cardLink}>
                    Ver tarifa
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      aria-hidden="true"
                      fill="none"
                    >
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Card>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
