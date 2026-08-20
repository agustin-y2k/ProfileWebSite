import { Button, Container } from "@sites/ui";
import { site } from "../data/site";
import avif320 from "../assets/profile-320.avif";
import avif640 from "../assets/profile-640.avif";
import webp320 from "../assets/profile-320.webp";
import webp640 from "../assets/profile-640.webp";
import jpg320 from "../assets/profile-320.jpg";
import jpg640 from "../assets/profile-640.jpg";
import styles from "./Hero.module.css";

/** Ancho real de render del retrato: 320px en móvil, ~400px desde 62rem. */
const IMAGE_SIZES = "(min-width: 62rem) 400px, min(100vw - 3rem, 320px)";

const ficha = [
  { key: "Ubicación", value: site.location },
  { key: "Foco", value: "Hardware · Software · Redes" },
  { key: "Proyecto", value: "ByteFix" },
];

export function Hero() {
  return (
    <section className={styles.hero} id="top">
      <Container className={styles.layout}>
        <div className={styles.copy}>
          <p className="label">{site.role}</p>

          <h1 className={styles.title}>
            Hola, soy <span className={styles.name}>Ramiro Agustín</span>.
          </h1>

          <p className={styles.subtitle}>
            Equipos que funcionan, código con criterio y redes que se sostienen en el día
            a día.
          </p>

          <p className={styles.lead}>
            Paso el día traduciendo problemas técnicos en soluciones concretas: a veces
            hace falta abrir el gabinete, a veces escribir un script, a veces revisar el
            router. Me gusta que cada cosa quede en su lugar.
          </p>

          <div className={styles.actions}>
            <Button href="#contacto" size="lg">
              Escribime
            </Button>
            <Button href="#trabajo" variant="soft" size="lg">
              Ver lo que hago
            </Button>
          </div>

          <dl className={styles.ficha}>
            {ficha.map((item) => (
              <div key={item.key} className={styles.fichaRow}>
                <dt className="label">{item.key}</dt>
                <dd className={styles.fichaValue}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.visual}>
          <div className={styles.frame}>
            {/* El navegador elige el primer `source` que soporta. El orden va de
                más eficiente a más compatible; `sizes` le dice el ancho real de
                render para que no baje la variante de 640 en un móvil. */}
            <picture>
              <source
                type="image/avif"
                srcSet={`${avif320} 320w, ${avif640} 640w`}
                sizes={IMAGE_SIZES}
              />
              <source
                type="image/webp"
                srcSet={`${webp320} 320w, ${webp640} 640w`}
                sizes={IMAGE_SIZES}
              />
              <img
                src={jpg320}
                srcSet={`${jpg320} 320w, ${jpg640} 640w`}
                sizes={IMAGE_SIZES}
                width={640}
                height={640}
                alt="Retrato de Ramiro Agustín"
                className={styles.photo}
                /* Es la imagen LCP: prioridad alta y sin lazy loading. */
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>
        </div>
      </Container>
    </section>
  );
}
