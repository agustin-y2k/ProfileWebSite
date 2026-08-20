import { Container, Section } from "@sites/ui";
import { site } from "../data/site";
import styles from "./Contact.module.css";

const channels = [
  {
    label: "Correo",
    value: site.email,
    href: `mailto:${site.email}`,
    icon: (
      <path
        d="M3.5 6.5h17v11h-17v-11zm0 0L12 13l8.5-6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "GitHub",
    value: "agustin-y2k",
    href: site.github,
    external: true,
    icon: (
      <path
        d="M9 19c-4.5 1.4-4.5-2.3-6-2.7m12 4.7v-3.6a3.1 3.1 0 00-.9-2.4c2.9-.3 6-1.4 6-6.4a4.9 4.9 0 00-1.4-3.4 4.6 4.6 0 00-.1-3.4s-1.1-.3-3.6 1.4a12.3 12.3 0 00-6.4 0C6.1 1.5 5 1.8 5 1.8a4.6 4.6 0 00-.1 3.4A4.9 4.9 0 003.5 8.6c0 5 3 6.1 5.9 6.4a3.1 3.1 0 00-.9 2.4V21"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "Teléfono",
    value: site.phone.display,
    href: site.phone.href,
    icon: (
      <path
        d="M6.2 3.5h3.1l1.5 4.2-2 1.4a12.4 12.4 0 006.1 6.1l1.4-2 4.2 1.5v3.1a1.8 1.8 0 01-2 1.8C10.9 19.9 4.1 13.1 3.4 5.5a1.8 1.8 0 011.8-2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    ),
  },
];

export function Contact() {
  return (
    <Section id="contacto" labelledBy="contacto-titulo" tone="alt">
      <Container>
        <header className={styles.head}>
          <p className="label">Contacto</p>
          <h2 id="contacto-titulo" className={styles.title}>
            Contame qué necesitás
          </h2>
          <p className={styles.intro}>
            Escribime qué pasa con tu equipo, tu red o tu idea de software y te respondo
            con algo concreto: qué se puede hacer, cómo y cuánto.
          </p>
        </header>

        <ul className={styles.grid}>
          {channels.map((channel) => (
            <li key={channel.label}>
              <a
                className={styles.card}
                href={channel.href}
                {...("external" in channel && channel.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <span className={styles.icon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    {channel.icon}
                  </svg>
                </span>
                <span className={styles.cardLabel}>{channel.label}</span>
                <span className={styles.cardValue}>{channel.value}</span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
