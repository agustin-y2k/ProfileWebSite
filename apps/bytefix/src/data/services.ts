export type Service = {
  id: string;
  title: string;
  description: string;
  badge?: string;
};

export const services: readonly Service[] = [
  {
    id: "gobierno",
    title: "Notebooks del Gobierno",
    description:
      "Desbloqueo definitivo, optimización del sistema y puesta a punto integral para estudiar o trabajar sin límites.",
    badge: "Más pedido",
  },
  {
    id: "tecnico",
    title: "Servicio Técnico General",
    description:
      "Instalación de sistemas operativos y software, limpieza física y cambio de pasta térmica.",
  },
  {
    id: "hardware",
    title: "Reparación de Hardware",
    description:
      "Microsoldadura y reparación a nivel de placa: pin de carga, detección de cortos, reemplazo de componentes SMD y diagnóstico de fallas eléctricas.",
  },
  {
    id: "datos",
    title: "Recuperación de Datos",
    description:
      "Rescate de archivos de discos o pendrives dañados, sujeto a evaluación técnica.",
  },
  {
    id: "upgrade",
    title: "Upgrades & SSD",
    description:
      "Instalación de discos de estado sólido y ampliación de memoria RAM para acelerar equipos que todavía dan pelea.",
  },
  {
    id: "web",
    title: "Programación Web & Scripts",
    description:
      "Desarrollo de páginas web profesionales y scripts para automatizar procesos y ahorrar tiempo.",
  },
  {
    id: "redes",
    title: "Redes y Servidores",
    description:
      "Configuración de redes WiFi/LAN, administración de servidores y optimización de conectividad segura.",
  },
];
