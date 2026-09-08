import { Container, Reveal, Section } from "@sites/ui";
import { useIdioma } from "../i18n/contexto";
import { Galeria } from "../components/Galeria";
import { projects } from "../data/projects";
import styles from "./Projects.module.css";

export function Projects() {
  const { t } = useIdioma();

  return (
    <Section id="proyectos" labelledBy="proyectos-titulo">
      <Container>
        <header className={styles.head}>
          <p className="label">{t({ es: "Proyectos", en: "Projects" })}</p>
          <h2 id="proyectos-titulo" className={styles.title}>
            {t({ es: "Lo que construí", en: "What I've built" })}
          </h2>
          <p className={styles.intro}>
            {t({
              es: "Software propio, con el código a la vista. No prototipos: sistemas que resuelven un problema concreto de alguien.",
              en: "My own software, with the source in the open. Not prototypes: systems that solve a concrete problem for someone.",
            })}
          </p>
        </header>

        <ol className={styles.list}>
          {projects.map((project, i) => (
            <li key={project.id}>
              <Reveal delay={i * 80}>
                <article className={styles.card}>
                  <div className={styles.body}>
                    <div className={styles.heading}>
                      <h3 className={styles.name}>{project.name}</h3>
                      <p className={styles.tagline}>{t(project.tagline)}</p>
                      {project.status ? (
                        <span className={styles.status}>{t(project.status)}</span>
                      ) : null}
                    </div>

                    <p className={styles.desc}>{t(project.description)}</p>

                    <ul className={styles.highlights}>
                      {project.highlights.map((point) => (
                        <li key={t(point)} className={styles.highlight}>
                          {t(point)}
                        </li>
                      ))}
                    </ul>

                    <div className={styles.foot}>
                      <ul
                        className={styles.tags}
                        aria-label={t({
                          es: `Stack de ${project.name}`,
                          en: `${project.name} tech stack`,
                        })}
                      >
                        {project.stack.map((tech) => (
                          <li key={tech} className={styles.tag}>
                            {tech}
                          </li>
                        ))}
                      </ul>

                      {project.repo ? (
                        <a
                          className={styles.repo}
                          href={project.repo}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="17"
                            height="17"
                            aria-hidden="true"
                            fill="none"
                          >
                            <path
                              d="M9 19c-4.5 1.4-4.5-2.3-6-2.7m12 4.7v-3.6a3.1 3.1 0 00-.9-2.4c2.9-.3 6-1.4 6-6.4a4.9 4.9 0 00-1.4-3.4 4.6 4.6 0 00-.1-3.4s-1.1-.3-3.6 1.4a12.3 12.3 0 00-6.4 0C6.1 1.5 5 1.8 5 1.8a4.6 4.6 0 00-.1 3.4A4.9 4.9 0 003.5 8.6c0 5 3 6.1 5.9 6.4a3.1 3.1 0 00-.9 2.4V21"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {t({
                            es: "Ver el código en GitHub",
                            en: "View the code on GitHub",
                          })}
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {project.capturas ? (
                    <Galeria capturas={project.capturas} proyecto={project.name} />
                  ) : null}
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
