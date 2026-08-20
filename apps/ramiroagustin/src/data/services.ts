export type Service = {
  id: string;
  index: string;
  title: string;
  description: string;
  detail: readonly string[];
};

export const services: readonly Service[] = [
  {
    id: "hardware",
    index: "01",
    title: "Reparación de computadoras",
    description:
      "Diagnóstico claro, limpieza, upgrades y recuperación de datos cuando el hardware lo permite. Te explico en qué conviene invertir y en qué no.",
    detail: [
      "Diagnóstico",
      "Limpieza y pasta térmica",
      "Upgrades y SSD",
      "Recuperación de datos",
    ],
  },
  {
    id: "software",
    index: "02",
    title: "Programación",
    description:
      "Páginas web, scripts y automatizaciones para que lo repetitivo lo haga la máquina. Código legible, sin magia negra.",
    detail: ["Sitios web", "Scripts y automatización", "Integraciones", "Mantenimiento"],
  },
  {
    id: "redes",
    index: "03",
    title: "Redes",
    description:
      "Wi-Fi que llega, router bien configurado, VLANs sencillas y VPN cuando hace falta. Prioridad: estabilidad y seguridad razonable.",
    detail: ["Wi-Fi y cobertura", "Routers y VLANs", "VPN", "Servidores caseros"],
  },
];
