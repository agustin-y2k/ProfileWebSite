import { Button, Container } from "@sites/ui";
import { Prosa, useIdioma } from "../i18n/contexto";
import { site } from "../data/site";
import avif320 from "../assets/profile-320.avif";
import avif640 from "../assets/profile-640.avif";
import webp320 from "../assets/profile-320.webp";
import webp640 from "../assets/profile-640.webp";
import jpg320 from "../assets/profile-320.jpg";
import jpg640 from "../assets/profile-640.jpg";
import styles from "./Hero.module.css";

/** Retrato compacto en móvil; desde tablet acompaña el texto en otra columna. */
const IMAGE_SIZES = "(min-width: 64rem) 400px, (min-width: 40rem) 35vw, 144px";

export function Hero() {
  const { t } = useIdioma();

  return (
    <section className={styles.hero} id="top">
      <Container className={styles.layout}>
        <div className={styles.copy}>
          <p className="label">
            {t({ es: "Programador", en: "Software developer" })} · {t(site.location)}
          </p>

          <h1 className={styles.title}>{site.name}</h1>

          <Prosa
            className={styles.lead}
            frase={{
              es: "Desarrollo software y automatizaciones. Estudio Ingeniería en Informática y también trabajo con hardware y redes.",
              en: "I build software and automation tools. I study Computer Engineering and also work with hardware and networks.",
            }}
          />

          <div className={styles.actions}>
            <Button href={`${site.github}?tab=repositories`} target="_blank" size="lg">
              {t({ es: "Ver proyectos", en: "View projects" })}
            </Button>
            <Button href="#contacto" variant="soft" size="lg">
              {t({ es: "Escríbeme", en: "Get in touch" })}
            </Button>
          </div>
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
                alt={t({
                  es: `Retrato de ${site.name}`,
                  en: `Portrait of ${site.name}`,
                })}
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
