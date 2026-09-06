/* ─────────────────────────────────────────────────────────────────────────────
   El clip del flujo de reserva.

   Una captura prueba que la pantalla existe; el clip prueba que el sistema
   anda. Es el mismo recorrido que hace una docente para reservar una clase,
   grabado del sistema corriendo: elegir la materia, el día y el horario, tildar
   las computadoras y confirmar.

   Los archivos los genera scripts/capturas.sh a partir del reserva.webm que
   graba docs/guias/generar/grabar-reserva.mjs en el repo del sistema. Son tres
   y se importan a mano: no son un juego de anchos como las capturas, y un glob
   acá escondería cuál es cuál.
   ────────────────────────────────────────────────────────────────────────── */

import mp4 from "../assets/capturas/reserva-1280.mp4?url";
import webm from "../assets/capturas/reserva-1280.webm?url";
import poster from "../assets/capturas/reserva-poster.jpg?url";

export type Clip = {
  /** Pesa la mitad que el mp4, y lo entiende casi todo. Va primero. */
  webm: string;
  /** El que queda para lo que no sepa leer el webm. */
  mp4: string;
  /** Lo que se ve antes de que arranque. */
  poster: string;
  ancho: number;
  alto: number;
  /** Qué pasa en el clip, para quien no lo puede mirar. */
  descripcion: string;
};

export const clipDeReserva: Clip = {
  webm,
  mp4,
  poster,
  ancho: 1280,
  alto: 800,
  descripcion:
    "Reservar una clase, de punta a punta: elegir la materia, el día y el horario, tildar las computadoras y confirmar. La reserva queda hecha y aparece en el listado de la docente.",
};
