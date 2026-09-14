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
      <Container className={styles.layout}>
        <div className={styles.copy}>
          <p className="label">Taller de informática y software</p>

          <h1 className={styles.title}>Tecnología que funciona bien.</h1>

          <p className={styles.lead}>
            Activación y optimización de notebooks escolares, reparación de hardware a nivel de placa y
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
        </div>

        {/* Ficha de diagnóstico: lo primero que se hace con cualquier equipo antes
            de tocarlo. Reemplaza el glow decorativo por algo que viene del propio
            oficio —una lectura, tres estados— en vez de un efecto de CSS. */}
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.panel}>
            <svg viewBox="0 0 280 320" className={styles.diagram} fill="none" stroke="currentColor">
              <path d="M18 46V22h24" strokeWidth="2" strokeLinecap="round" />
              <path d="M262 46V22h-24" strokeWidth="2" strokeLinecap="round" />
              <path d="M18 190v24h24" strokeWidth="2" strokeLinecap="round" />
              <path d="M262 190v24h-24" strokeWidth="2" strokeLinecap="round" />

              <polyline
                points="30,120 68,120 84,78 104,152 126,58 150,142 170,108 190,108 212,88 232,120 250,120"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              <line x1="18" y1="236" x2="262" y2="236" strokeWidth="1" opacity="0.25" />

              <circle cx="26" cy="259" r="4" stroke="none" className={styles.dotOk} />
              <text x="42" y="263" className={styles.rowLabel}>
                Placa
              </text>
              <text x="262" y="263" textAnchor="end" className={styles.rowValue}>
                OK
              </text>

              <circle cx="26" cy="285" r="4" stroke="none" className={styles.dotWarn} />
              <text x="42" y="289" className={styles.rowLabel}>
                Batería
              </text>
              <text x="262" y="289" textAnchor="end" className={styles.rowValue}>
                Revisar
              </text>

              <circle cx="26" cy="311" r="4" stroke="none" className={styles.dotOk} />
              <text x="42" y="315" className={styles.rowLabel}>
                Pantalla
              </text>
              <text x="262" y="315" textAnchor="end" className={styles.rowValue}>
                OK
              </text>
            </svg>
          </div>
        </div>
      </Container>
    </section>
  );
}
