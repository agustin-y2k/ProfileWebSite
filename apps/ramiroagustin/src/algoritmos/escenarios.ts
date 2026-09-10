import type { Frase } from "../i18n/idioma";
import { COLS, FILAS, ORIGEN, DESTINO, type Terreno } from "./motor";

/**
 * Cada escenario es un tablero calibrado para que el algoritmo demuestre una
 * cosa. Un clic alcanza para verla: dibujar el propio tablero exige entender
 * el modelo antes de que haya recompensa, y eso es pedirle demasiado a alguien
 * que llegó de un enlace y le va a dar treinta segundos.
 *
 * Son dos colecciones, y la diferencia no es de tamaño sino de qué preguntan.
 *
 * `TERRENOS` tiene costos —pasto, barro— y sirve para A*: la pregunta ahí es
 * cuál camino sale más barato y cuánto tablero hace falta abrir para saberlo.
 *
 * `LABERINTOS` no tiene costos: solo muro y libre. Es lo único honesto para
 * BFS y DFS, que ignoran los costos por definición. Un tablero donde la mitad
 * de lo dibujado es invisible para el algoritmo que lo recorre no explica
 * nada: obliga a la narración a pedir disculpas por su propio dibujo.
 *
 * Los números de cada uno están verificados en escenarios.test.ts, porque las
 * moralejas que la página afirma son afirmaciones sobre estos tableros.
 */

const vacio = (): Terreno[] => new Array<Terreno>(FILAS * COLS).fill("libre");

function rect(
  t: Terreno[],
  f0: number,
  f1: number,
  c0: number,
  c1: number,
  tipo: Terreno,
) {
  for (let f = f0; f <= f1; f++) {
    for (let c = c0; c <= c1; c++) {
      if (f >= 0 && f < FILAS && c >= 0 && c < COLS) t[f * COLS + c] = tipo;
    }
  }
  return t;
}

export type Escenario = {
  id: string;
  nombre: Frase;
  armar: () => Terreno[];
};

const lleno = (): Terreno[] => new Array<Terreno>(FILAS * COLS).fill("muro");

/**
 * Un claro de pasto con un corazón de barro, y ni un solo muro. El camino
 * barato lo rodea entero; el que va derecho lo cruza y sale casi el doble de
 * caro. Lo usan dos escenarios: cambiando únicamente cuánto se le cree a la
 * heurística, el mismo tablero da una respuesta o la otra.
 */
const rodeo = (): Terreno[] => {
  const t = vacio();
  rect(t, 2, 8, 5, 11, "pasto");
  rect(t, 3, 7, 6, 10, "barro");
  return t;
};

/** Los tableros con costo. Son los de A*: sin costos no tendría qué pesar. */
export const TERRENOS: Escenario[] = [
  {
    id: "rodeo",
    nombre: { es: "El rodeo", en: "The long way round" },
    armar: rodeo,
  },
  {
    id: "atajo",
    nombre: { es: "El atajo caro", en: "The expensive shortcut" },
    armar: () => {
      const t = vacio();
      rect(t, 1, 10, 8, 8, "muro");
      t[5 * COLS + 8] = "barro";
      return t;
    },
  },
  {
    id: "corazonada",
    nombre: { es: "La corazonada exagerada", en: "The overblown hunch" },
    // El mismo tablero que «El rodeo». Lo único que cambia es el peso que el
    // motor le da a la heurística, y por eso están los dos: la comparación es
    // consigo mismo, no con otro algoritmo.
    armar: rodeo,
  },
  {
    id: "sinsalida",
    nombre: { es: "Sin salida", en: "No way out" },
    armar: () => {
      const t = vacio();
      rect(t, 3, 7, 6, 10, "barro");
      t[4 * COLS + 15] = "muro";
      t[6 * COLS + 15] = "muro";
      t[5 * COLS + 14] = "muro";
      t[5 * COLS + 16] = "muro";
      return t;
    },
  },
];

/**
 * Los tableros sin costo. Son los de BFS y DFS, y cada uno está armado para
 * que la diferencia entre una cola y una pila se vea sola.
 */
export const LABERINTOS: Escenario[] = [
  {
    id: "sala",
    nombre: { es: "La sala abierta", en: "The open room" },
    // Sin una sola pared. BFS se abre en rombos perfectos y abre casi todo el
    // tablero; DFS apila los vecinos en orden y saca siempre el de la derecha,
    // así que dispara en línea recta al destino y acierta a la primera.
    armar: vacio,
  },
  {
    id: "bifurcacion",
    nombre: { es: "La bifurcación", en: "The fork" },
    // Un anillo: por arriba se llega en 17 casillas, por abajo en 25. La pila
    // saca el vecino de abajo antes que el de arriba, así que DFS agarra el
    // largo — y lo trae como si fuera una respuesta.
    armar: () => {
      const t = lleno();
      rect(t, 4, 10, 1, 1, "libre");
      rect(t, 4, 4, 1, 15, "libre");
      rect(t, 10, 10, 1, 15, "libre");
      rect(t, 4, 10, 15, 15, "libre");
      return t;
    },
  },
  {
    id: "sellado",
    nombre: { es: "El destino tapiado", en: "The walled-off target" },
    // Las cuatro casillas que rodean al destino son muro. No hay camino, y la
    // única forma de saberlo es agotar todo lo alcanzable: los dos abren el
    // tablero entero antes de poder decirlo.
    armar: () => {
      const t = vacio();
      for (const id of [4 * COLS + 15, 6 * COLS + 15, 5 * COLS + 14, 5 * COLS + 16]) {
        t[id] = "muro";
      }
      return t;
    },
  },
];

/** Los dos juegos juntos, para resolver un id venga de donde venga. */
export const TABLEROS: Escenario[] = [...TERRENOS, ...LABERINTOS];

/** El origen y el destino nunca son muro, pase lo que pase con el escenario. */
export function armar(escenario: Escenario): Terreno[] {
  const t = escenario.armar();
  t[ORIGEN] = "libre";
  t[DESTINO] = "libre";
  return t;
}
