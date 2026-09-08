import { Container, Reveal, Section } from "@sites/ui";
import { useIdioma } from "../i18n/contexto";
import { services } from "../data/services";
import styles from "./Work.module.css";

export function Work() {
  const { t } = useIdioma();

  return (
    <Section id="trabajo" labelledBy="trabajo-titulo" tone="alt">
      <Container>
        <header className={styles.head}>
          <p className="label">{t({ es: "Servicios", en: "Services" })}</p>
          <h2 id="trabajo-titulo" className={styles.title}>
            {t({ es: "En qué puedo ayudarte", en: "How I can help" })}
          </h2>
          <p className={styles.intro}>
            {t({
              es: "Tres frentes que, en casas y negocios, casi siempre terminan mezclándose.",
              en: "Three fronts that, in homes and small businesses, almost always end up tangled together.",
            })}
          </p>
        </header>

        <ol className={styles.list}>
          {services.map((service, i) => (
            <li key={service.id}>
              <Reveal delay={i * 80}>
                <article className={styles.item}>
                  <span className={styles.index} aria-hidden="true">
                    {service.index}
                  </span>
                  <div className={styles.body}>
                    <h3 className={styles.itemTitle}>{t(service.title)}</h3>
                    <p className={styles.itemText}>{t(service.description)}</p>
                    <ul className={styles.tags}>
                      {service.detail.map((tag) => (
                        <li key={t(tag)} className={styles.tag}>
                          {t(tag)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
