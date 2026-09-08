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

import type { Frase } from "../i18n/idioma";
import medidas from "./medidas.json";
import {
  agruparArchivos,
  lectorDeJuegos,
  type Juego,
  type Tabla,
  type Version,
} from "./agrupar-capturas";

export type { Juego, Version };

const archivos = import.meta.glob<string>("../assets/capturas/*.{avif,webp,jpg}", {
  eager: true,
  query: "?url",
  import: "default",
});

/** Lo que se escribe a mano de cada captura. El resto sale de los archivos. */
type Ficha = {
  id: string;
  titulo: Frase;
  /** Qué resuelve esa pantalla, en una línea. Es el argumento de venta. */
  pie: Frase;
  /**
   * El `alt` se traduce como cualquier otro texto, y con el mismo cuidado: es
   * lo único que recibe quien navega con lector de pantalla, así que una
   * versión más corta que la otra no es un ahorro, es una pantalla que se
   * describe peor en un idioma.
   */
  alt: Frase;
};

export type Captura = Ficha & Record<Version, Juego>;

const fichas: readonly Ficha[] = [
  {
    id: "01-mostrador",
    titulo: { es: "El mostrador del día", en: "The day at the counter" },
    pie: {
      es: "Lo primero que ve quien atiende: qué hay que entregar ahora, qué equipos están afuera del laboratorio y con cuántos se cuenta.",
      en: "The first thing the person at the desk sees: what has to go out now, which machines are out of the lab, and how many are left.",
    },
    alt: {
      es: "Pantalla de inicio del administrador: tarjetas de qué entregar ahora, qué equipos están afuera, cuántos quedan en el laboratorio, la entrega sin reserva y las próximas clases",
      en: "Administrator home screen: cards for what to hand out now, which machines are out, how many remain in the lab, walk-up lending, and the upcoming classes",
    },
  },
  {
    id: "02-nueva-reserva",
    titulo: { es: "Reservar una clase", en: "Booking a class" },
    pie: {
      es: "El docente elige día, horario y cuántas computadoras necesita, y puede dejar la reserva repetida todas las semanas de una sola vez.",
      en: "The teacher picks a day, a time slot and how many computers they need, and can set the booking to repeat every week in one go.",
    },
    alt: {
      es: "Formulario de nueva reserva: materia, fecha, hora de inicio y fin, la lista de computadoras de cada carro para tildar las que se necesitan y los otros equipos que se prestan, como el proyector",
      en: "New booking form: subject, date, start and end time, the list of computers in each cart with checkboxes for the ones needed, and the other lendable equipment such as the projector",
    },
  },
  {
    id: "03-mis-reservas",
    titulo: { es: "Cada docente ve lo suyo", en: "Every teacher sees their own" },
    pie: {
      es: "Cambiar una computadora o cancelar una clase no requiere pasar por el mostrador ni pedirle permiso a nadie.",
      en: "Swapping a computer or cancelling a class takes no trip to the counter and nobody's permission.",
    },
    alt: {
      es: "Listado de las reservas de una docente, cada una con su materia, horario, las computadoras asignadas y los botones para cambiarlas o cancelar",
      en: "A teacher's list of bookings, each with its subject, time slot, assigned computers and the buttons to change them or cancel",
    },
  },
  {
    id: "10-inventario-docente",
    titulo: { es: "Qué hay en cada carro", en: "What's in each cart" },
    pie: {
      es: "El estado de cada equipo y el software que tiene instalado, para elegir con qué dar la clase antes de reservar.",
      en: "The condition of every machine and the software on it, so the class can be planned around what's actually available.",
    },
    alt: {
      es: "Tabla de las computadoras de un carro con su estado, si están freezadas, el software instalado y las acciones de ver calendario o reportar un problema, y debajo los otros equipos que presta la escuela",
      en: "Table of a cart's computers with their condition, whether they are frozen, the installed software and the actions to view the calendar or report a fault, with the school's other lendable equipment below",
    },
  },
  {
    id: "04-inventario-admin",
    titulo: { es: "El inventario, carro por carro", en: "Inventory, cart by cart" },
    pie: {
      es: "Altas, bajas, mantenimiento, licencias e incidencias sobre la misma ficha, sin planillas paralelas. Y no solo de las notebooks: también del proyector y los cargadores que se prestan.",
      en: "Additions, retirements, maintenance, licences and faults on one record, with no spreadsheet running alongside. And not just for the laptops: the projector and the chargers are lent out too.",
    },
    alt: {
      es: "Gestión del inventario: los equipos que se prestan y no están en ningún carro, y la ficha de cada computadora del carro con su número de serie, el software instalado y las acciones de mantenimiento",
      en: "Inventory management: the lendable equipment that belongs to no cart, and the record for each computer in the cart with its serial number, installed software and maintenance actions",
    },
  },
  {
    id: "08-academico",
    titulo: {
      es: "Cada escuela se organiza distinta",
      en: "Every school is organised differently",
    },
    pie: {
      es: "El ciclo lectivo, los cursos, las materias y quién dicta cada una. La división y la modalidad son opcionales: la primaria y la universidad cargan lo que usan y dejan vacío el resto.",
      en: "The school year, the classes, the subjects and who teaches each one. Section and track are optional: a primary school and a university each fill in what they use and leave the rest empty.",
    },
    alt: {
      es: "Pantalla de ciclos, cursos y materias: el formulario para abrir un ciclo lectivo, el ciclo 2026 activo con el alta de un curso por año y división, y las materias de 1°A con los docentes que las dictan",
      en: "School years, classes and subjects screen: the form to open a school year, the active 2026 year with the form to add a class by grade and section, and the subjects of 1-A with the teachers who teach them",
    },
  },
  {
    id: "07-licencias",
    titulo: { es: "Licencias antes de que venzan", en: "Licences before they expire" },
    pie: {
      es: "Qué software vence en cada equipo y cuántos días quedan. El aviso llega por mail antes del corte, no cuando el programa dejó de abrir.",
      en: "Which software expires on which machine and how many days are left. The warning arrives by email before the cutoff, not the morning the program stops opening.",
    },
    alt: {
      es: "Listado de licencias de software por equipo, cada una con su plazo de renovación y cuántos días antes avisa; las que todavía no tienen fecha de vencimiento cargada aparecen marcadas",
      en: "List of software licences by machine, each with its renewal window and how many days ahead it warns; the ones with no expiry date entered yet are flagged",
    },
  },
  {
    id: "05-reportes",
    titulo: {
      es: "Números para justificar una compra",
      en: "Numbers to justify a purchase",
    },
    pie: {
      es: "Horas reservadas por equipo y por docente, el estado del parque y qué se rompe, por ciclo lectivo y exportable a CSV para adjuntar a un pedido.",
      en: "Hours booked per machine and per teacher, the state of the fleet and what keeps breaking, by school year and exportable to CSV to attach to a request.",
    },
    alt: {
      es: "Reportes de uso: tabla de horas reservadas por equipo con barras de porcentaje, horas por docente, incidencias del período y el estado del parque de equipos",
      en: "Usage reports: a table of hours booked per machine with percentage bars, hours per teacher, faults for the period and the state of the equipment fleet",
    },
  },
  {
    id: "09-reportes-oscuro",
    titulo: { es: "También en oscuro", en: "In dark mode too" },
    pie: {
      es: "El tema sigue al del sistema operativo o se fuerza a mano. Todas las pantallas están hechas para los dos, no solo el inicio.",
      en: "The theme follows the operating system or gets set by hand. Every screen is built for both, not just the home page.",
    },
    alt: {
      es: "La misma pantalla de reportes con el tema oscuro activado",
      en: "The same reports screen with the dark theme turned on",
    },
  },
  {
    id: "11-movil",
    titulo: { es: "En el teléfono, dentro del aula", en: "On a phone, in the classroom" },
    pie: {
      es: "La misma aplicación, sin instalar nada: reservar, ver lo que viene y avisar que una máquina no anda, desde donde está el problema.",
      en: "The same application, nothing to install: book, check what's coming up and report a machine that won't start, from where the problem actually is.",
    },
    alt: {
      es: "Tres tramos de la aplicación en un teléfono: el saludo con los avisos sin leer, las próximas clases reservadas y el menú de acciones",
      en: "Three slices of the application on a phone: the greeting with unread notices, the upcoming booked classes and the actions menu",
    },
  },
];

/** Las medidas que generó el script, para no volver a escribirlas a mano. */
const tabla = medidas as Tabla;

const juego = lectorDeJuegos(agruparArchivos(archivos), tabla);

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
