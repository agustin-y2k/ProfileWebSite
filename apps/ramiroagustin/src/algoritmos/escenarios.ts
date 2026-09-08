import type { Frase } from "../i18n/idioma";
import { COLS, FILAS, ORIGEN, DESTINO, type Terreno } from "./motor";

/**
 * Cada escenario es un tablero calibrado para que el algoritmo demuestre una
 * cosa. Un clic alcanza para verla: dibujar el propio tablero exige entender
 * el modelo antes de que haya recompensa, y eso es pedirle demasiado a alguien
 * que llegó de un enlace y le va a dar treinta segundos.
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

export const ESCENARIOS: Escenario[] = [
  {
    id: "rodeo",
    nombre: { es: "El rodeo", en: "The long way round" },
    armar: () => {
      const t = vacio();
      rect(t, 2, 8, 5, 11, "pasto");
      rect(t, 3, 7, 6, 10, "barro");
      return t;
    },
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
    id: "empate",
    nombre: { es: "Empate", en: "Tie" },
    armar: () => rect(vacio(), 4, 6, 5, 11, "muro"),
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

/** El origen y el destino nunca son muro, pase lo que pase con el escenario. */
export function armar(escenario: Escenario): Terreno[] {
  const t = escenario.armar();
  t[ORIGEN] = "libre";
  t[DESTINO] = "libre";
  return t;
}
