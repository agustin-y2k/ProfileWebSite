import sgrcAvif640 from "../assets/sgrc-640.avif";
import sgrcAvif1280 from "../assets/sgrc-1280.avif";
import sgrcAvif1920 from "../assets/sgrc-1920.avif";
import sgrcWebp640 from "../assets/sgrc-640.webp";
import sgrcWebp1280 from "../assets/sgrc-1280.webp";
import sgrcWebp1920 from "../assets/sgrc-1920.webp";
import sgrcJpg640 from "../assets/sgrc-640.jpg";
import sgrcJpg1280 from "../assets/sgrc-1280.jpg";
import sgrcJpg1920 from "../assets/sgrc-1920.jpg";

/** Los tres formatos de una misma captura, ya como `srcSet`. */
export type ProjectImage = {
  avif: string;
  webp: string;
  /** Fallback para navegadores sin avif ni webp; también el `src` del `img`. */
  jpg: string;
  fallback: string;
  width: number;
  height: number;
  alt: string;
};

export type Project = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Las decisiones técnicas que distinguen al proyecto de un CRUD. Tres, no más. */
  highlights: readonly string[];
  stack: readonly string[];
  repo?: string;
  /** Solo para lo que todavía no está terminado; ausente significa publicado. */
  status?: string;
  image?: ProjectImage;
};

const srcSet = (variants: Record<number, string>) =>
  Object.entries(variants)
    .map(([width, url]) => `${url} ${width}w`)
    .join(", ");

export const projects: readonly Project[] = [
  {
    id: "sgrc",
    name: "SGRC",
    tagline: "Gestión y reserva de computadoras educativas",
    description:
      "Una institución tiene carros con notebooks que se prestan a las aulas, y eso se coordinaba en un cuaderno: dos docentes reservaban la misma máquina, nadie sabía cuál estaba rota y ninguna compra se podía justificar con números. El sistema lleva el inventario, las reservas atadas a cada materia, las entregas del mostrador y los reportes de uso.",
    highlights: [
      "El solapamiento lo impide PostgreSQL con una constraint de exclusión, no una validación de la aplicación que se pueda ganar por carrera.",
      "La reserva y la custodia son entidades distintas: dónde está un equipo se deriva del préstamo abierto, en vez de guardarse en una columna que se desincroniza.",
      "Monolito modular en Go: los módulos se hablan solo por interfaces, y hay una prueba que falla si alguien cruza un límite.",
    ],
    stack: ["Go", "PostgreSQL", "React 19", "TypeScript", "Docker", "Cloudflare Tunnel"],
    repo: "https://github.com/agustin-y2k/sgrc",
    image: {
      avif: srcSet({ 640: sgrcAvif640, 1280: sgrcAvif1280, 1920: sgrcAvif1920 }),
      webp: srcSet({ 640: sgrcWebp640, 1280: sgrcWebp1280, 1920: sgrcWebp1920 }),
      jpg: srcSet({ 640: sgrcJpg640, 1280: sgrcJpg1280, 1920: sgrcJpg1920 }),
      fallback: sgrcJpg1280,
      width: 1920,
      height: 1000,
      alt: "Pantalla de inicio del administrador de SGRC: qué entregar ahora, qué está afuera del laboratorio y con cuántos equipos se cuenta",
    },
  },
];
