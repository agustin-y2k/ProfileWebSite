import type { Frase } from "../i18n/idioma";
import { capturas, type Captura } from "./capturas";

export type Project = {
  id: string;
  name: string;
  tagline: Frase;
  description: Frase;
  /** Las decisiones técnicas que distinguen al proyecto de un CRUD. Tres, no más. */
  highlights: readonly Frase[];
  /** Nombres de tecnologías: no se traducen en ningún idioma. */
  stack: readonly string[];
  repo?: string;
  /** Solo para lo que todavía no está terminado; ausente significa publicado. */
  status?: Frase;
  /** Las pantallas que muestra la galería. Sin esto, la ficha va sin imágenes. */
  capturas?: readonly Captura[];
};

export const projects: readonly Project[] = [
  {
    id: "sgrc",
    name: "SGRC",
    tagline: {
      es: "Gestión y reserva de computadoras educativas",
      en: "Managing and booking computers in a school",
    },
    description: {
      es: "Una institución tiene carros con notebooks que se prestan a las aulas, y eso se coordinaba en un cuaderno: dos docentes reservaban la misma máquina, nadie sabía cuál estaba rota y ninguna compra se podía justificar con números. El sistema lleva el inventario, las reservas atadas a cada materia, las entregas del mostrador y los reportes de uso.",
      en: "A school has carts of laptops that get lent out to classrooms, and the whole thing was coordinated in a paper notebook: two teachers would book the same machine, nobody knew which ones were broken, and no purchase could be justified with numbers. The system handles the inventory, bookings tied to each subject, the lending desk and the usage reports.",
    },
    highlights: [
      {
        es: "El solapamiento lo impide PostgreSQL con una constraint de exclusión, no una validación de la aplicación que se pueda ganar por carrera.",
        en: "Double bookings are blocked by a PostgreSQL exclusion constraint, not by an application check that a race condition can beat.",
      },
      {
        es: "La reserva y la custodia son entidades distintas: dónde está un equipo se deriva del préstamo abierto, en vez de guardarse en una columna que se desincroniza.",
        en: "A booking and custody of a machine are separate things: where a laptop is gets derived from the open loan instead of living in a column that drifts out of sync.",
      },
      {
        es: "Monolito modular en Go: los módulos se hablan solo por interfaces, y hay una prueba que falla si alguien cruza un límite.",
        en: "A modular monolith in Go: modules talk to each other only through interfaces, and a test fails if anyone crosses a boundary.",
      },
    ],
    stack: ["Go", "PostgreSQL", "React 19", "TypeScript", "Docker", "Cloudflare Tunnel"],
    repo: "https://github.com/agustin-y2k/sgrc",
    capturas,
  },
];
