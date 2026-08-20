import { Container, Section } from "@sites/ui";
import { site } from "../data/site";
import { WhatsAppButton } from "../components/WhatsAppButton";
import styles from "./Contact.module.css";

export function Contact() {
  return (
    <Section id="contacto" labelledBy="contacto-titulo" tone="alt">
      <Container>
        <div className={styles.layout}>
          <div className={styles.copy}>
            <p className="label">Contacto</p>
            <h2 id="contacto-titulo" className={styles.title}>
              Contame qué le pasa a tu equipo
            </h2>
            <p className={styles.intro}>
              Escribime por WhatsApp con el modelo y qué síntoma tiene. Te digo si tiene
              arreglo, cuánto sale y cuándo lo podés traer.
            </p>
            <WhatsAppButton href={site.whatsapp} size="lg" className={styles.cta}>
              Escribir por WhatsApp
            </WhatsAppButton>
          </div>

          <address className={styles.details}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Dirección</span>
              <a
                className={styles.rowLink}
                href={site.maps}
                target="_blank"
                rel="noopener noreferrer"
              >
                {site.street}
                <br />
                {site.city}, {site.region}
                <span className={styles.mapsHint}>
                  Ver en Google Maps
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    aria-hidden="true"
                    fill="none"
                  >
                    <path
                      d="M7 17L17 7M17 7H9M17 7v8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </a>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Teléfono</span>
              <a className={styles.rowLink} href={site.phone.href}>
                {site.phone.display}
              </a>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Modalidad</span>
              <span className={styles.rowValue}>En taller o a domicilio</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Horario</span>
              {/* Mientras `hours` sea null se muestra cómo se coordina de
                  verdad, en vez de inventar un horario que haga que alguien
                  viaje al taller y lo encuentre cerrado. */}
              <span className={styles.rowValue}>
                {site.hours ?? "A coordinar por WhatsApp"}
              </span>
            </div>
          </address>
        </div>
      </Container>
    </Section>
  );
}
