/* ─────────────────────────────────────────────────────────────────────────────
   Las capturas de SGRC que muestra la galería de la sección Proyectos.

   Los archivos y sus medidas los genera scripts/capturas.sh desde el repo del
   sistema. De cada pantalla salen tres versiones: la página entera, que es la
   que abre la lupa, y dos recortes para la tarjeta. El de escritorio sale de
   la captura de escritorio y el de teléfono, de la del teléfono: no son la
   misma interfaz —en 390 px las tablas del sistema se vuelven tarjetas y los
   botones crecen—, y encoger la de escritorio para meterla en la tarjeta
   dejaba el texto en diez píxeles en una pantalla grande y en tres en un
   teléfono. Qué se recorta de cada pantalla está escrito en
   scripts/capturas.sh, al lado del ffmpeg que lo hace; cuál de los dos recibe
   cada visitante lo decide el `media` de la galería.

   Son quince archivos por pantalla —tres versiones, tres formatos, dos
   anchos—, así que se importan con un glob y no con un `import` por archivo.
   ────────────────────────────────────────────────────────────────────────── */

import medidas from "./medidas.json";

const archivos = import.meta.glob<string>("../assets/capturas/*.{avif,webp,jpg}", {
  eager: true,
  query: "?url",
  import: "default",
});

/** La página entera, el recorte de escritorio y el del teléfono. */
export type Version = "completa" | "detalle" | "foco";

type Formato = "avif" | "webp" | "jpg";

/** Un `srcSet` por formato, indexado por `<id>:<versión>`. */
const fuentes = new Map<string, Record<Formato, string[]>>();

/** La URL del jpg suelta, para el `src` del `img`. Hay un solo ancho en jpg. */
const respaldos = new Map<string, string>();

for (const [ruta, url] of Object.entries(archivos)) {
  // `01-mostrador-1800.avif` es la página entera; `01-mostrador-foco-450.webp`,
  // un recorte. El id lleva guiones y termina en cualquier cosa, así que el
  // `+?` es lo que evita que se coma la palabra de la versión.
  const partes = /([^/]+?)(?:-(detalle|foco))?-(\d+)\.(avif|webp|jpg)$/.exec(ruta);
  const id = partes?.[1];
  const version = (partes?.[2] ?? "completa") as Version;
  const ancho = partes?.[3];
  const formato = partes?.[4] as Formato | undefined;
  if (!id || !ancho || !formato) continue;

  const clave = `${id}:${version}`;
  const juego = fuentes.get(clave) ?? { avif: [], webp: [], jpg: [] };
  juego[formato].push(`${url} ${ancho}w`);
  fuentes.set(clave, juego);

  if (formato === "jpg") respaldos.set(clave, url);
}

/** Lo que se escribe a mano de cada captura. El resto sale de los archivos. */
type Ficha = {
  id: string;
  titulo: string;
  /** Qué resuelve esa pantalla, en una línea. Es el argumento de venta. */
  pie: string;
  alt: string;
};

/** Una versión lista para servir: los tres `srcSet` y el tamaño del archivo. */
export type Juego = {
  avif: string;
  webp: string;
  jpg: string;
  /** `src` del `img`; el navegador que ignore los `srcSet` recibe este. */
  respaldo: string;
  ancho: number;
  alto: number;
};

export type Captura = Ficha & Record<Version, Juego>;

const fichas: readonly Ficha[] = [
  {
    id: "01-mostrador",
    titulo: "El mostrador del día",
    pie: "Lo primero que ve quien atiende: qué hay que entregar ahora, qué equipos están afuera del laboratorio y con cuántos se cuenta.",
    alt: "Pantalla de inicio del administrador: tarjetas de qué entregar ahora, qué equipos están afuera, cuántos quedan en el laboratorio, la entrega sin reserva y las próximas clases",
  },
  {
    id: "02-nueva-reserva",
    titulo: "Reservar una clase",
    pie: "El docente elige día, horario y cuántas computadoras necesita, y puede dejar la reserva repetida todas las semanas de una sola vez.",
    alt: "Formulario de nueva reserva: materia, fecha, hora de inicio y fin, la lista de computadoras de cada carro para tildar las que se necesitan y los otros equipos que se prestan, como el proyector",
  },
  {
    id: "03-mis-reservas",
    titulo: "Cada docente ve lo suyo",
    pie: "Cambiar una computadora o cancelar una clase no requiere pasar por el mostrador ni pedirle permiso a nadie.",
    alt: "Listado de las reservas de una docente, cada una con su materia, horario, las computadoras asignadas y los botones para cambiarlas o cancelar",
  },
  {
    id: "10-inventario-docente",
    titulo: "Qué hay en cada carro",
    pie: "El estado de cada equipo y el software que tiene instalado, para elegir con qué dar la clase antes de reservar.",
    alt: "Tabla de las computadoras de un carro con su estado, si están freezadas, el software instalado y las acciones de ver calendario o reportar un problema, y debajo los otros equipos que presta la escuela",
  },
  {
    id: "04-inventario-admin",
    titulo: "El inventario, carro por carro",
    pie: "Altas, bajas, mantenimiento, licencias e incidencias sobre la misma ficha, sin planillas paralelas. Y no solo de las notebooks: también del proyector y los cargadores que se prestan.",
    alt: "Gestión del inventario: los equipos que se prestan y no están en ningún carro, y la ficha de cada computadora del carro con su número de serie, el software instalado y las acciones de mantenimiento",
  },
  {
    id: "08-academico",
    titulo: "Cada escuela se organiza distinta",
    pie: "El ciclo lectivo, los cursos, las materias y quién dicta cada una. La división y la modalidad son opcionales: la primaria y la universidad cargan lo que usan y dejan vacío el resto.",
    alt: "Pantalla de ciclos, cursos y materias: el formulario para abrir un ciclo lectivo, el ciclo 2026 activo con el alta de un curso por año y división, y las materias de 1°A con los docentes que las dictan",
  },
  {
    id: "07-licencias",
    titulo: "Licencias antes de que venzan",
    pie: "Qué software vence en cada equipo y cuántos días quedan. El aviso llega por mail antes del corte, no cuando el programa dejó de abrir.",
    alt: "Listado de licencias de software por equipo, cada una con su plazo de renovación y cuántos días antes avisa; las que todavía no tienen fecha de vencimiento cargada aparecen marcadas",
  },
  {
    id: "05-reportes",
    titulo: "Números para justificar una compra",
    pie: "Horas reservadas por equipo y por docente, el estado del parque y qué se rompe, por ciclo lectivo y exportable a CSV para adjuntar a un pedido.",
    alt: "Reportes de uso: tabla de horas reservadas por equipo con barras de porcentaje, horas por docente, incidencias del período y el estado del parque de equipos",
  },
  {
    id: "09-reportes-oscuro",
    titulo: "También en oscuro",
    pie: "El tema sigue al del sistema operativo o se fuerza a mano. Todas las pantallas están hechas para los dos, no solo el inicio.",
    alt: "La misma pantalla de reportes con el tema oscuro activado",
  },
  {
    id: "11-movil",
    titulo: "En el teléfono, dentro del aula",
    pie: "La misma aplicación, sin instalar nada: reservar, ver lo que viene y avisar que una máquina no anda, desde donde está el problema.",
    alt: "Tres tramos de la aplicación en un teléfono: el saludo con los avisos sin leer, las próximas clases reservadas y el menú de acciones",
  },
];

/** Las medidas que generó el script, para no volver a escribirlas a mano. */
const tabla = medidas as Record<string, Record<Version, number[]> | undefined>;

function juego(id: string, version: Version): Juego {
  const fuente = fuentes.get(`${id}:${version}`);
  const respaldo = respaldos.get(`${id}:${version}`);
  const [ancho, alto] = tabla[id]?.[version] ?? [];

  if (!fuente || !respaldo || ancho === undefined || alto === undefined) {
    throw new Error(
      `Falta la versión "${version}" de la captura "${id}". ` +
        `Corré scripts/capturas.sh con el docs/capturas del repo de SGRC.`,
    );
  }

  return {
    avif: fuente.avif.join(", "),
    webp: fuente.webp.join(", "),
    jpg: fuente.jpg.join(", "),
    respaldo,
    ancho,
    alto,
  };
}

/**
 * Falla en el build, no en producción: `pnpm build` prerrenderiza esta lista,
 * así que una captura sin archivos rompe el build en vez de servir un `img`
 * roto a quien entre al sitio.
 */
export const capturas: readonly Captura[] = fichas.map((ficha) => ({
  ...ficha,
  completa: juego(ficha.id, "completa"),
  detalle: juego(ficha.id, "detalle"),
  foco: juego(ficha.id, "foco"),
}));
