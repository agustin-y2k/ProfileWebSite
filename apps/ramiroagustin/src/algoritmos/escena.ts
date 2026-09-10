/**
 * Lo que un algoritmo le pide dibujar al visualizador.
 *
 * El motor de caminos (motor.ts) tiene su propio tipo de paso, porque su
 * dibujo es una grilla y nada más va a serlo. Los otros diez comparten estos
 * cuatro dibujantes, y esa es toda la razón por la que existe este archivo:
 * cada dibujante nuevo destraba varios algoritmos, así que conviene que un
 * algoritmo no pueda inventarse una forma de dibujar propia sin pensarlo.
 *
 * Ningún dibujante sabe qué algoritmo lo llenó. Reciben una escena —una foto
 * de un instante— y la pintan. Si un paso necesita algo que la escena no puede
 * expresar, la respuesta correcta es ampliar la escena para todos, no colar un
 * caso especial.
 *
 * Todo lo que se lee en pantalla es una `Frase`, así que una escena trae las
 * dos versiones y el dibujante elige cuál pinta. Eso hace que **una corrida
 * del algoritmo sirva para los dos idiomas**: cambiar de idioma no re-ejecuta
 * nada, y no hay forma de que la versión inglesa se calcule distinto que la
 * española. Donde el texto es un número o el nombre de un nodo va una cadena
 * pelada, que en `Frase` significa «esto es igual en los dos idiomas».
 */

import type { Frase } from "../i18n/idioma";

/** Estados de un nodo, en cualquier dibujante. Los colores salen de acá. */
export type EstadoNodo =
  | "normal"
  | "activo" // lo que el algoritmo está mirando en este paso
  | "cerrado" // ya resuelto, no se toca más
  | "pendiente" // en la estructura de espera
  | "descartado" // quedó afuera
  | "destacado"; // el protagonista del paso (la raíz, el mínimo, el ganador)

export type EstadoArista =
  | "normal"
  | "arbol" // parte de la solución
  | "mirando" // se está evaluando ahora
  | "apagada" // existe pero no se usa (puerto bloqueado, rama podada)
  | "tenue"; // contexto, sin protagonismo

// ── Grafo ──────────────────────────────────────────────────────────────────
// Dijkstra, Spanning Tree, Bellman-Ford, orden topológico y Union-Find. Las
// coordenadas van en un lienzo de 0 a 100 en los dos ejes; el dibujante se
// encarga de la escala y de que el texto no se deforme.

export type NodoGrafo = {
  id: string;
  x: number;
  y: number;
  nombre: Frase;
  /** Lo que va escrito abajo del nodo: una distancia, un tamaño, un turno. */
  etiqueta?: Frase;
  estado?: EstadoNodo;
};

export type AristaGrafo = {
  a: string;
  b: string;
  peso?: Frase;
  estado?: EstadoArista;
  /** Desvío lateral, para que dos aristas paralelas no se pisen. */
  curva?: number;
  /** Punta de flecha en `b`. Las dependencias tienen sentido; los cables no. */
  flecha?: boolean;
};

export type EscenaGrafo = {
  tipo: "grafo";
  nodos: NodoGrafo[];
  aristas: AristaGrafo[];
};

// ── Plano ──────────────────────────────────────────────────────────────────
// k-means, descenso de gradiente y hashing consistente. Los tres son puntos y
// líneas sobre dos ejes; que el hashing dibuje un anillo y el gradiente una
// parábola no los hace distintos para el dibujante.

export type PuntoPlano = {
  x: number;
  y: number;
  /** Índice de color. Mismo grupo, mismo color, en todos los dibujantes. */
  grupo?: number;
  forma?: "punto" | "centro" | "bolita" | "nodo";
  nombre?: Frase;
  estado?: EstadoNodo;
};

export type CurvaPlano = {
  puntos: { x: number; y: number }[];
  grupo?: number;
  tenue?: boolean;
  punteada?: boolean;
};

export type EscenaPlano = {
  tipo: "plano";
  curvas: CurvaPlano[];
  puntos: PuntoPlano[];
  ejes?: { x: Frase; y: Frase };
};

// ── Arreglo ────────────────────────────────────────────────────────────────
// Búsqueda binaria, y cualquier cosa que se explique señalando celdas.

export type CeldaArreglo = {
  valor: number;
  estado?: "fuera" | "rango" | "medio" | "hallada";
};

export type EscenaArreglo = {
  tipo: "arreglo";
  celdas: CeldaArreglo[];
  punteros: { nombre: Frase; indice: number }[];
};

// ── Árbol de juego ─────────────────────────────────────────────────────────
// Minimax. Se parece a un grafo, pero el turno de cada nodo es lo que hay que
// leer de un vistazo: un triángulo para arriba maximiza y uno para abajo
// minimiza. Con un círculo para todos, la explicación se pierde.

export type NodoJuego = {
  id: string;
  x: number;
  y: number;
  turno: "max" | "min" | "hoja";
  etiqueta: Frase;
  /** La ventana α–β mientras el nodo está abierto. */
  ventana?: Frase;
  estado?: EstadoNodo;
};

export type EscenaJuego = {
  tipo: "juego";
  nodos: NodoJuego[];
  aristas: { a: string; b: string; estado?: EstadoArista }[];
};

export type Escena = EscenaGrafo | EscenaPlano | EscenaArreglo | EscenaJuego;

/** Una fila del panel lateral: la estructura de datos que el algoritmo usa. */
export type ItemPanel = {
  clave: Frase;
  texto: Frase;
  nota?: Frase;
  /** El próximo en salir, el mínimo, el que gana. Se pinta distinto. */
  destacado?: boolean;
};

export type PasoEscena = {
  /** Línea del listado que se está ejecutando. 0 = ninguna. */
  linea: number;
  texto: Frase;
  escena: Escena;
  panel: ItemPanel[];
  /** Solo en el último paso: la moraleja, con los números de esta corrida. */
  veredicto?: Frase;
};

/** Interpola dos colores de grupo sin que cada algoritmo elija paleta. */
export const GRUPOS = 6;
