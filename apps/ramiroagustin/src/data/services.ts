import type { Frase } from "../i18n/idioma";

export type Service = {
  id: string;
  index: string;
  title: Frase;
  description: Frase;
  detail: readonly Frase[];
};

export const services: readonly Service[] = [
  {
    id: "hardware",
    index: "01",
    title: { es: "Reparación de computadoras", en: "Computer repair" },
    description: {
      es: "Diagnóstico claro, limpieza, upgrades y recuperación de datos cuando el hardware lo permite. Te explico en qué conviene invertir y en qué no.",
      en: "A clear diagnosis, cleaning, upgrades and data recovery when the hardware allows it. I'll tell you what's worth spending on and what isn't.",
    },
    detail: [
      { es: "Diagnóstico", en: "Diagnosis" },
      { es: "Limpieza y pasta térmica", en: "Cleaning and thermal paste" },
      { es: "Upgrades y SSD", en: "Upgrades and SSDs" },
      { es: "Recuperación de datos", en: "Data recovery" },
    ],
  },
  {
    id: "software",
    index: "02",
    title: { es: "Programación", en: "Programming" },
    description: {
      es: "Páginas web, scripts y automatizaciones para que lo repetitivo lo haga la máquina. Código legible, sin magia negra.",
      en: "Websites, scripts and automation so the repetitive part is the machine's problem. Readable code, no black magic.",
    },
    detail: [
      { es: "Sitios web", en: "Websites" },
      { es: "Scripts y automatización", en: "Scripts and automation" },
      { es: "Integraciones", en: "Integrations" },
      { es: "Mantenimiento", en: "Maintenance" },
    ],
  },
  {
    id: "redes",
    index: "03",
    title: { es: "Redes", en: "Networking" },
    description: {
      es: "Wi-Fi que llega, router bien configurado, VLANs sencillas y VPN cuando hace falta. Prioridad: estabilidad y seguridad razonable.",
      en: "Wi-Fi that actually reaches, a properly configured router, simple VLANs and a VPN when it's needed. The priority is stability and sensible security.",
    },
    detail: [
      { es: "Wi-Fi y cobertura", en: "Wi-Fi and coverage" },
      { es: "Routers y VLANs", en: "Routers and VLANs" },
      { es: "VPN", en: "VPN" },
      { es: "Servidores", en: "Servers" },
    ],
  },
];
