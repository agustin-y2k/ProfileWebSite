import { Container, Section } from "@sites/ui";
import { faq } from "../data/faq";
import styles from "./Faq.module.css";

/**
 * Schema FAQPage generado desde los mismos datos que se renderizan.
 *
 * Escribirlo a mano en el index.html sería duplicar el contenido: al primer
 * cambio de respuesta, el structured data quedaría mintiéndole a Google.
 *
 * El escape de `<` es obligatorio: una respuesta que contenga "</script>"
 * cerraría la etiqueta antes de tiempo e inyectaría markup en la página.
 */
function faqJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }).replace(/</g, "\\u003c");
}

export function Faq() {
  return (
    <Section id="preguntas" labelledBy="preguntas-titulo">
      <Container width="narrow">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqJsonLd() }}
        />
        <header className={styles.head}>
          <p className="label">Preguntas frecuentes</p>
          <h2 id="preguntas-titulo" className={styles.title}>
            Antes de escribir
          </h2>
        </header>

        <div className={styles.list}>
          {faq.map((item) => (
            /* <details> nativo: accesible, plegable y funcional sin JavaScript.
               Un acordeón hecho a mano solo agregaría estado y bugs. */
            <details key={item.question} className={styles.item} name="faq">
              <summary className={styles.question}>
                <span>{item.question}</span>
                <svg
                  className={styles.chevron}
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  fill="none"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <p className={styles.answer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
