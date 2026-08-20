import { Container, Reveal, Section } from "@sites/ui";
import { services } from "../data/services";
import styles from "./Work.module.css";

export function Work() {
  return (
    <Section id="trabajo" labelledBy="trabajo-titulo" tone="alt">
      <Container>
        <header className={styles.head}>
          <p className="label">Servicios</p>
          <h2 id="trabajo-titulo" className={styles.title}>
            En qué puedo ayudarte
          </h2>
          <p className={styles.intro}>
            Tres frentes que, en casas y negocios chicos, casi siempre terminan
            mezclándose.
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
                    <h3 className={styles.itemTitle}>{service.title}</h3>
                    <p className={styles.itemText}>{service.description}</p>
                    <ul className={styles.tags}>
                      {service.detail.map((tag) => (
                        <li key={tag} className={styles.tag}>
                          {tag}
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
