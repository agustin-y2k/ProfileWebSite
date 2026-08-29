/* ─────────────────────────────────────────────────────────────────────────────
   Las capturas de SGRC que muestra la galería de la sección Proyectos.

   Los archivos los genera scripts/capturas.sh desde el repo del sistema. Se
   importan con un glob y no con cinco `import` por captura: son tres formatos
   por dos anchos, y cada pantalla nueva agregaría otras cinco líneas de ruido.

   Cada archivo es la página entera, no un recorte: la tarjeta muestra la
   franja superior con `object-fit: cover` y la lupa muestra la misma imagen
   completa. Un solo juego de archivos sirve a los dos usos.
   ────────────────────────────────────────────────────────────────────────── */

const archivos = import.meta.glob<string>("../assets/capturas/*.{avif,webp,jpg}", {
  eager: true,
  query: "?url",
  import: "default",
});

type Formato = "avif" | "webp" | "jpg";

/** Un `srcSet` por formato, indexado por el nombre base de la captura. */
const fuentes = new Map<string, Record<Formato, string[]>>();

/** La URL del jpg suelta, para el `src` del `img`. Hay un solo ancho en jpg. */
const respaldos = new Map<string, string>();

for (const [ruta, url] of Object.entries(archivos)) {
  const partes = /([^/]+)-(\d+)\.(avif|webp|jpg)$/.exec(ruta);
  const id = partes?.[1];
  const ancho = partes?.[2];
  const formato = partes?.[3] as Formato | undefined;
  if (!id || !ancho || !formato) continue;

  const juego = fuentes.get(id) ?? { avif: [], webp: [], jpg: [] };
  juego[formato].push(`${url} ${ancho}w`);
  fuentes.set(id, juego);

  if (formato === "jpg") respaldos.set(id, url);
}

/** Lo que se escribe a mano de cada captura. El resto sale de los archivos. */
type Ficha = {
  id: string;
  titulo: string;
  /** Qué resuelve esa pantalla, en una línea. Es el argumento de venta. */
  pie: string;
  alt: string;
  /** Píxeles del PNG original: fijan la proporción de la imagen ampliada. */
  ancho: number;
  alto: number;
  /** `object-position` del recorte de la tarjeta. Por defecto, arriba. */
  encuadre?: string;
};

export type Captura = Ficha & {
  avif: string;
  webp: string;
  jpg: string;
  /** `src` del `img`; el navegador que ignore los `srcSet` recibe este. */
  respaldo: string;
};

const fichas: readonly Ficha[] = [
  {
    id: "01-mostrador",
    titulo: "El mostrador del día",
    pie: "Lo primero que ve quien atiende: qué hay que entregar ahora, qué equipos están afuera del laboratorio y con cuántos se cuenta.",
    alt: "Pantalla de inicio del administrador: tarjetas de qué entregar ahora, qué equipos están afuera, cuántos quedan en el laboratorio, la entrega sin reserva y las próximas clases",
    ancho: 2880,
    alto: 3720,
  },
  {
    id: "02-nueva-reserva",
    titulo: "Reservar una clase",
    pie: "El docente elige día, horario y cuántas computadoras necesita, y puede dejar la reserva repetida todas las semanas de una sola vez.",
    alt: "Formulario de nueva reserva: materia, fecha, hora de inicio y fin, la lista de computadoras de cada carro para tildar las que se necesitan y los otros equipos que se prestan, como el proyector",
    ancho: 2880,
    alto: 2320,
  },
  {
    id: "03-mis-reservas",
    titulo: "Cada docente ve lo suyo",
    pie: "Cambiar una computadora o cancelar una clase no requiere pasar por el mostrador ni pedirle permiso a nadie.",
    alt: "Listado de las reservas de una docente, cada una con su materia, horario, las computadoras asignadas y los botones para cambiarlas o cancelar",
    ancho: 2880,
    alto: 1800,
  },
  {
    id: "10-inventario-docente",
    titulo: "Qué hay en cada carro",
    pie: "El estado de cada equipo y el software que tiene instalado, para elegir con qué dar la clase antes de reservar.",
    alt: "Tabla de las computadoras de un carro con su estado, si están freezadas, el software instalado y las acciones de ver calendario o reportar un problema, y debajo los otros equipos que presta la escuela",
    ancho: 2880,
    alto: 2026,
  },
  {
    id: "04-inventario-admin",
    titulo: "El inventario, carro por carro",
    pie: "Altas, bajas, mantenimiento, licencias e incidencias sobre la misma ficha, sin planillas paralelas. Y no solo de las notebooks: también del proyector y los cargadores que se prestan.",
    alt: "Gestión del inventario: los equipos que se prestan y no están en ningún carro, y la ficha de cada computadora del carro con su número de serie, el software instalado y las acciones de mantenimiento",
    ancho: 2880,
    alto: 4904,
    // El encabezado va seguido del formulario vacío de un carro nuevo. Bajar
    // el recorte un quinto de la página lo cambia por las fichas de los
    // equipos, que es lo que la pantalla realmente muestra.
    encuadre: "50% 18%",
  },
  {
    id: "07-licencias",
    titulo: "Licencias antes de que venzan",
    pie: "Qué software vence en cada equipo y cuántos días quedan. El aviso llega por mail antes del corte, no cuando el programa dejó de abrir.",
    alt: "Listado de licencias de software por equipo, cada una con su plazo de renovación y cuántos días antes avisa; las que todavía no tienen fecha de vencimiento cargada aparecen marcadas",
    ancho: 2880,
    alto: 1816,
  },
  {
    id: "05-reportes",
    titulo: "Números para justificar una compra",
    pie: "Horas reservadas por equipo y por docente, el estado del parque y qué se rompe, por ciclo lectivo y exportable a CSV para adjuntar a un pedido.",
    alt: "Reportes de uso: tabla de horas reservadas por equipo con barras de porcentaje, horas por docente, incidencias del período y el estado del parque de equipos",
    ancho: 2880,
    alto: 3224,
  },
  {
    id: "09-reportes-oscuro",
    titulo: "También en oscuro",
    pie: "El tema sigue al del sistema operativo o se fuerza a mano. Todas las pantallas están hechas para los dos, no solo el inicio.",
    alt: "La misma pantalla de reportes con el tema oscuro activado",
    ancho: 2880,
    alto: 3224,
  },
  {
    id: "11-movil",
    titulo: "En el teléfono, dentro del aula",
    pie: "La misma aplicación, sin instalar nada: reservar, ver lo que viene y avisar que una máquina no anda, desde donde está el problema.",
    alt: "Tres tramos de la aplicación en un teléfono: el saludo con los avisos sin leer, las próximas clases reservadas y el menú de acciones",
    ancho: 4004,
    alto: 2502,
  },
];

/**
 * Falla en el build, no en producción: `pnpm build` prerrenderiza esta lista,
 * así que una captura sin archivos rompe el build en vez de servir un `img`
 * roto a quien entre al sitio.
 */
export const capturas: readonly Captura[] = fichas.map((ficha) => {
  const juego = fuentes.get(ficha.id);
  const respaldo = respaldos.get(ficha.id);
  if (!juego || !respaldo) {
    throw new Error(
      `Falta la captura "${ficha.id}" en src/assets/capturas. ` +
        `Corré scripts/capturas.sh con el docs/capturas del repo de SGRC.`,
    );
  }

  return {
    ...ficha,
    avif: juego.avif.join(", "),
    webp: juego.webp.join(", "),
    jpg: juego.jpg.join(", "),
    respaldo,
  };
});
