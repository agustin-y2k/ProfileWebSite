import { capturas, type Captura } from "./capturas";

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
  /** Las pantallas que muestra la galería. Sin esto, la ficha va sin imágenes. */
  capturas?: readonly Captura[];
};

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
    capturas,
  },
];
