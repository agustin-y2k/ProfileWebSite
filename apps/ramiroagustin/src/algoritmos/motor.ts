/**
 * Los tres algoritmos que cruzan el tablero, con un contrato común.
 *
 * Cada uno recibe el terreno y devuelve la lista completa de pasos. El
 * visualizador no sabe de ninguno: solo reproduce pasos. Ese corte es lo que
 * hace que sumar un algoritmo nuevo sea escribir una función y un listado de
 * código, en vez de tocar la interfaz.
 *
 * Los pasos se calculan enteros de una y después se navegan. Es lo que permite
 * la barra de tiempo: ir y volver no re-ejecuta nada.
 */

import type { Frase, Idioma } from "../i18n/idioma";

export const FILAS = 11;
export const COLS = 17;

export type Terreno = "libre" | "pasto" | "barro" | "muro";

export const COSTOS: Record<Terreno, number> = {
  libre: 1,
  pasto: 3,
  barro: 6,
  muro: Infinity,
};

export const ORIGEN = 5 * COLS + 1;
export const DESTINO = 5 * COLS + 15;

export type Resumen = {
  /** null cuando no hay camino posible. */
  costo: number | null;
  largo: number;
  expandidas: number;
  barro: number;
};

export type Paso = {
  /** Línea del listado que se está ejecutando. 0 = ninguna. */
  linea: number;
  texto: Frase;
  actual: number | null;
  /** Celda que queda resuelta para siempre en este paso. */
  cerrar: number | null;
  /** El número que va escrito en esa celda. */
  etiqueta: { id: number; valor: number } | null;
  /** Pendientes, con el próximo en salir PRIMERO. */
  frontera: { id: number; texto: Frase }[];
  camino: number[] | null;
  cerrados: number;
  resumen?: Resumen;
};

export const nombre = (id: number) => `(${Math.floor(id / COLS)},${id % COLS})`;

/**
 * El nombre de cada terreno, para la narración.
 *
 * La clave del objeto es el tipo interno y nunca se muestra cruda: `barro` es
 * un identificador del código, no una palabra que alguien deba leer. Va como
 * `Record<Idioma, string>` y no como `Frase` porque la narración lo interpola
 * adentro de una oración distinta por idioma, así que necesita las dos
 * versiones sueltas.
 */
const TERRENO: Record<Terreno, Record<Idioma, string>> = {
  libre: { es: "libre", en: "open" },
  pasto: { es: "pasto", en: "grass" },
  barro: { es: "barro", en: "mud" },
  muro: { es: "muro", en: "wall" },
};

export function vecinos(id: number): number[] {
  const f = Math.floor(id / COLS);
  const c = id % COLS;
  const r: number[] = [];
  if (f > 0) r.push(id - COLS);
  if (f < FILAS - 1) r.push(id + COLS);
  if (c > 0) r.push(id - 1);
  if (c < COLS - 1) r.push(id + 1);
  return r;
}

/**
 * Costo de pisar una celda. Fuera de la grilla es infinito, igual que un muro:
 * `noUncheckedIndexedAccess` obliga a decidir qué pasa con un índice que no
 * existe, y la respuesta honesta es «no se puede pasar».
 */
function costoCelda(terreno: Terreno[], id: number): number {
  const tipo = terreno[id];
  return tipo === undefined ? Infinity : COSTOS[tipo];
}

const pasable = (terreno: Terreno[], id: number) => costoCelda(terreno, id) !== Infinity;

/**
 * Distancia Manhattan hasta el destino.
 *
 * Es admisible porque ninguna casilla cuesta menos de 1, así que nunca
 * sobreestima lo que falta. Sin esa propiedad A* dejaría de garantizar el
 * óptimo: la corazonada podría descartar el camino barato antes de mirarlo.
 */
export function heuristica(id: number): number {
  const f = Math.floor(id / COLS);
  const c = id % COLS;
  return Math.abs(f - Math.floor(DESTINO / COLS)) + Math.abs(c - (DESTINO % COLS));
}

function reconstruir(previo: Map<number, number>): number[] | null {
  if (!previo.has(DESTINO)) return null;
  const camino: number[] = [];
  let cur: number | undefined = DESTINO;
  while (cur !== undefined) {
    camino.push(cur);
    cur = previo.get(cur);
  }
  return camino.reverse();
}

const costoDe = (terreno: Terreno[], camino: number[]) =>
  camino.slice(1).reduce((total, id) => total + costoCelda(terreno, id), 0);

/** Cierre común: reconstruye el camino y arma el resumen final. */
function cerrar(
  pasos: Paso[],
  terreno: Terreno[],
  previo: Map<number, number>,
  cerrados: Set<number>,
  texto: Frase,
): Paso[] {
  const camino = reconstruir(previo);

  pasos.push({
    linea: 0,
    texto: camino
      ? texto
      : {
          es: "La cola se vació sin llegar al destino.",
          en: "The queue ran dry without ever reaching the target.",
        },
    actual: null,
    cerrar: null,
    etiqueta: null,
    frontera: [],
    camino,
    cerrados: cerrados.size,
    resumen: {
      costo: camino ? costoDe(terreno, camino) : null,
      largo: camino ? camino.length : 0,
      expandidas: cerrados.size,
      barro: camino ? camino.filter((id) => terreno[id] === "barro").length : 0,
    },
  });

  return pasos;
}

/**
 * El costo del camino más barato del tablero, sin pasos ni narración.
 *
 * BFS y DFS afirman en pantalla cuánto se pasaron, y eso es una afirmación
 * sobre el tablero —cuál era el mínimo—, no sobre otro algoritmo. Se calcula
 * acá adentro, en una corrida muda, para que nadie tenga que ejecutar un
 * visualizador entero para leer un número.
 */
export function costoOptimo(terreno: Terreno[]): number | null {
  const dist = new Map([[ORIGEN, 0]]);
  const cerrados = new Set<number>();
  const cola: [number, number][] = [[ORIGEN, 0]];

  while (cola.length) {
    let mi = 0;
    for (let i = 1; i < cola.length; i++) if (cola[i]![1] < cola[mi]![1]) mi = i;
    const [actual, d] = cola.splice(mi, 1)[0]!;

    if (cerrados.has(actual)) continue;
    cerrados.add(actual);
    if (actual === DESTINO) return d;

    for (const v of vecinos(actual)) {
      if (!pasable(terreno, v)) continue;
      const cand = d + costoCelda(terreno, v);
      if (cand < (dist.get(v) ?? Infinity)) {
        dist.set(v, cand);
        cola.push([v, cand]);
      }
    }
  }

  return null;
}

// ── A* ────────────────────────────────────────────────────────────────────

/**
 * Cuánto se le cree a la corazonada.
 *
 * Con 1, `h` nunca sobreestima —ninguna casilla cuesta menos de 1— y el camino
 * que sale es el óptimo, siempre. Multiplicarla rompe justamente eso: pasa a
 * decir «falta más de lo que falta», y en cuanto puede exagerar, la garantía se
 * muere. No es un error de nadie: es el <b>A* ponderado</b> que se usa a
 * propósito en videojuegos, canjeando calidad del camino por tablero que no
 * hace falta abrir. El escenario existe para que ese canje se vea.
 */
const PESO = (escenario: string) => (escenario === "corazonada" ? 4 : 1);

export function correrAEstrella(terreno: Terreno[], escenario = "rodeo"): Paso[] {
  const peso = PESO(escenario);
  const h = (id: number) => peso * heuristica(id);
  const comoSuma = (id: number) =>
    peso === 1 ? `${heuristica(id)}` : `${peso}×${heuristica(id)}`;

  const pasos: Paso[] = [];
  const g = new Map([[ORIGEN, 0]]);
  const previo = new Map<number, number>();
  const cerrados = new Set<number>();
  const cola: [number, number][] = [[ORIGEN, h(ORIGEN)]];

  const frontera = () =>
    [...cola]
      .sort((a, b) => a[1] - b[1])
      .map(([id, f]) => ({ id, texto: `f = ${g.get(id)} + ${comoSuma(id)} = ${f}` }));

  const base = () => ({
    actual: null,
    cerrar: null,
    etiqueta: null,
    frontera: frontera(),
    camino: null,
    cerrados: cerrados.size,
  });

  pasos.push({
    ...base(),
    linea: 5,
    etiqueta: { id: ORIGEN, valor: 0 },
    texto:
      peso === 1
        ? {
            es: `Arranco en <b>${nombre(ORIGEN)}</b>. La prioridad no es solo lo recorrido: es <code>f = g + h</code>, donde <b>g</b> es lo que ya gasté y <b>h</b> estima lo que falta hasta el destino en línea recta.`,
            en: `I start at <b>${nombre(ORIGEN)}</b>. The priority is not just the ground covered: it is <code>f = g + h</code>, where <b>g</b> is what I have already spent and <b>h</b> estimates what is left to the target in a straight line.`,
          }
        : {
            es: `Mismo tablero que «El rodeo» y mismo algoritmo, con un solo cambio: la prioridad es <code>f = g + ${peso}h</code>. A la corazonada <b>se le cree ${peso} veces más de lo que vale</b>, y con eso deja de ser una estimación prudente para pasar a ser una orden de ir hacia el destino.`,
            en: `Same board as «The long way round» and the same algorithm, with a single change: the priority is <code>f = g + ${peso}h</code>. The hunch is <b>believed ${peso} times more than it is worth</b>, and with that it stops being a cautious estimate and becomes an order to head for the target.`,
          },
  });

  while (cola.length) {
    let mi = 0;
    for (let i = 1; i < cola.length; i++) if (cola[i]![1] < cola[mi]![1]) mi = i;
    const [actual, f] = cola.splice(mi, 1)[0]!;
    const gAct = g.get(actual)!;

    pasos.push({
      ...base(),
      linea: 9,
      actual,
      texto: {
        es: `Saco <b>${nombre(actual)}</b>: <code>f = ${gAct} + ${comoSuma(actual)} = ${f}</code>, el más prometedor. Fijate que prefiere las que apuntan al destino.`,
        en: `I pop <b>${nombre(actual)}</b>: <code>f = ${gAct} + ${comoSuma(actual)} = ${f}</code>, the most promising one. Notice how it favours the cells pointing at the target.`,
      },
    });

    if (cerrados.has(actual)) continue;

    cerrados.add(actual);
    pasos.push({
      ...base(),
      linea: 11,
      actual,
      cerrar: actual,
      texto:
        peso === 1
          ? {
              es: `Cierro <b>${nombre(actual)}</b> con <code>g=${gAct}</code>. Como <b>h</b> nunca sobreestima lo que falta, sigue valiendo la garantía: esta distancia es definitiva.`,
              en: `I close <b>${nombre(actual)}</b> with <code>g=${gAct}</code>. Since <b>h</b> never overestimates what is left, the guarantee still holds: this distance is final.`,
            }
          : {
              es: `Cierro <b>${nombre(actual)}</b> con <code>g=${gAct}</code> y no lo vuelvo a tocar. <b>Acá se rompe todo</b>: la garantía se apoyaba en que <b>h</b> nunca se pasara, y ahora se pasa — así que sellar esta casilla puede estar sellando un valor que no era el mínimo.`,
              en: `I close <b>${nombre(actual)}</b> with <code>g=${gAct}</code> and never touch it again. <b>This is where it breaks</b>: the guarantee rested on <b>h</b> never overshooting, and now it does — so sealing this square may well be sealing a value that was not the minimum.`,
            },
    });

    if (actual === DESTINO) {
      pasos.push({
        ...base(),
        linea: 12,
        actual,
        texto:
          peso === 1
            ? {
                es: `Llegué con costo <b>${gAct}</b>, y es el mínimo: con una <b>h</b> que nunca sobreestima, el primer cierre del destino ya es el definitivo.`,
                en: `I got there at cost <b>${gAct}</b>, and it is the minimum: with an <b>h</b> that never overestimates, the first time the target is settled is already final.`,
              }
            : {
                es: `Llegué con costo <b>${gAct}</b>. Y llegué rápido — pero <b>nadie garantiza que sea el mínimo</b>, y no lo es.`,
                en: `I got there at cost <b>${gAct}</b>. And I got there fast — but <b>nothing guarantees it is the minimum</b>, and it is not.`,
              },
      });
      break;
    }

    for (const v of vecinos(actual)) {
      if (!pasable(terreno, v)) continue;
      const costo = costoCelda(terreno, v);
      const cand = gAct + costo;
      if (cand < (g.get(v) ?? Infinity)) {
        const tipo = TERRENO[terreno[v]!];
        g.set(v, cand);
        previo.set(v, actual);
        cola.push([v, cand + h(v)]);
        pasos.push({
          ...base(),
          linea: 17,
          actual,
          etiqueta: { id: v, valor: cand },
          texto: {
            es: `Encolo <b>${nombre(v)}</b> —${tipo.es}, cuesta ${costo}— con <code>g=${cand}</code> y <code>h=${comoSuma(v)}</code>: prioridad <b>${cand + h(v)}</b>.`,
            en: `I queue <b>${nombre(v)}</b> —${tipo.en}, costs ${costo}— with <code>g=${cand}</code> and <code>h=${comoSuma(v)}</code>: priority <b>${cand + h(v)}</b>.`,
          },
        });
      }
    }
  }

  return cerrar(
    pasos,
    terreno,
    previo,
    cerrados,
    peso === 1
      ? {
          es: "Camino óptimo: la corazonada orientó la búsqueda sin llegar a mentir nunca.",
          en: "An optimal path: the hunch steered the search without ever once lying.",
        }
      : {
          es: `Llegó, y mirando mucho menos tablero. El camino, en cambio, ya no es el más barato — y el algoritmo <b>no tiene forma de notarlo</b>.`,
          en: `It arrived, and looked at far less board. The path, on the other hand, is no longer the cheapest — and the algorithm <b>has no way of noticing</b>.`,
        },
  );
}

// ── BFS ───────────────────────────────────────────────────────────────────
export function correrBFS(terreno: Terreno[]): Paso[] {
  const pasos: Paso[] = [];
  const profundidad = new Map([[ORIGEN, 0]]);
  const previo = new Map<number, number>();
  const vistos = new Set([ORIGEN]);
  const cerrados = new Set<number>();
  const cola: number[] = [ORIGEN];

  const frontera = () =>
    cola.map((id) => ({
      id,
      texto: { es: `paso ${profundidad.get(id)}`, en: `step ${profundidad.get(id)}` },
    }));
  const base = () => ({
    actual: null,
    cerrar: null,
    etiqueta: null,
    frontera: frontera(),
    camino: null,
    cerrados: cerrados.size,
  });

  pasos.push({
    ...base(),
    linea: 4,
    etiqueta: { id: ORIGEN, valor: 0 },
    texto: {
      es: `Una <b>cola</b> común: el primero que entra es el primero que sale. Toda la diferencia entre este algoritmo y el otro está en esa línea.`,
      en: `A plain <b>queue</b>: first in, first out. The entire difference between this algorithm and the other one lives in that line.`,
    },
  });

  while (cola.length) {
    const actual = cola.shift()!;
    cerrados.add(actual);

    pasos.push({
      ...base(),
      linea: 7,
      actual,
      cerrar: actual,
      texto: {
        es: `Saco <b>${nombre(actual)}</b>, el que más tiempo lleva esperando. Está a <b>${profundidad.get(actual)} pasos</b> del origen.`,
        en: `I pop <b>${nombre(actual)}</b>, the one that has been waiting longest. It sits <b>${profundidad.get(actual)} steps</b> from the source.`,
      },
    });

    if (actual === DESTINO) {
      pasos.push({
        ...base(),
        linea: 8,
        actual,
        texto: {
          es: `Llegué en <b>${profundidad.get(actual)} pasos</b>, y es el camino más corto que existe. <b>No hace falta comprobar nada más</b>: como la cola sale en orden de profundidad, todo lo que quedaba pendiente está a esta distancia o más lejos.`,
          en: `I got there in <b>${profundidad.get(actual)} steps</b>, and it is the shortest path there is. <b>Nothing else needs checking</b>: since the queue comes out in depth order, everything still pending sits at this distance or further.`,
        },
      });
      break;
    }

    for (const v of vecinos(actual)) {
      if (!pasable(terreno, v) || vistos.has(v)) continue;
      vistos.add(v);
      profundidad.set(v, profundidad.get(actual)! + 1);
      previo.set(v, actual);
      cola.push(v);
      pasos.push({
        ...base(),
        linea: 12,
        actual,
        etiqueta: { id: v, valor: profundidad.get(v)! },
        texto: {
          es: `Descubro <b>${nombre(v)}</b> y lo mando <b>al final</b> de la cola. Por eso no lo voy a mirar hasta haber terminado con todo lo que está más cerca que él.`,
          en: `I discover <b>${nombre(v)}</b> and send it to the back of the queue. I never ask what stepping on it costs: to BFS, mud and open ground are the same thing.`,
        },
      });
    }
  }

  return cerrar(pasos, terreno, previo, cerrados, {
    es: "El camino más corto en cantidad de casillas.",
    en: "The shortest path measured in number of squares.",
  });
}

// ── DFS ───────────────────────────────────────────────────────────────────
export function correrDFS(terreno: Terreno[]): Paso[] {
  const pasos: Paso[] = [];
  const orden = new Map<number, number>();
  const previo = new Map<number, number>();
  const vistos = new Set<number>();
  const cerrados = new Set<number>();
  const pila: number[] = [ORIGEN];
  let n = 0;

  const frontera = () => [...pila].reverse().map((id) => ({ id, texto: nombre(id) }));
  const base = () => ({
    actual: null,
    cerrar: null,
    etiqueta: null,
    frontera: frontera(),
    camino: null,
    cerrados: cerrados.size,
  });

  pasos.push({
    ...base(),
    linea: 4,
    texto: {
      es: `Una <b>pila</b> en vez de una cola: sale el último que entró. Ese solo cambio hace que en vez de abrirse en anillos, se zambulla por un pasillo.`,
      en: `A <b>stack</b> instead of a queue: last in, first out. That single change is why it dives down one corridor instead of spreading out in rings.`,
    },
  });

  while (pila.length) {
    const actual = pila.pop()!;
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    cerrados.add(actual);
    orden.set(actual, n++);

    pasos.push({
      ...base(),
      linea: 7,
      actual,
      cerrar: actual,
      etiqueta: { id: actual, valor: orden.get(actual)! },
      texto: {
        es: `Saco <b>${nombre(actual)}</b>, el último que entró. Es la casilla número <b>${orden.get(actual)}</b> que visito.`,
        en: `I pop <b>${nombre(actual)}</b>, the last one in. It is square number <b>${orden.get(actual)}</b> that I visit.`,
      },
    });

    if (actual === DESTINO) {
      pasos.push({
        ...base(),
        linea: 10,
        actual,
        texto: {
          es: `Llegué. Pero el camino que traigo es <b>el primero que apareció</b>, no el mejor — y cuál aparece primero lo decide el orden en que apilé los vecinos, que es un detalle de implementación, no una propiedad del problema.`,
          en: `I got there. But the path I carry is <b>the first one that turned up</b>, not the best one — and which one turns up first is decided by the order I pushed the neighbours in, which is an implementation detail, not a property of the problem.`,
        },
      });
      break;
    }

    for (const v of vecinos(actual)) {
      if (!pasable(terreno, v) || vistos.has(v)) continue;
      if (!previo.has(v)) previo.set(v, actual);
      pila.push(v);
    }

    pasos.push({
      ...base(),
      linea: 15,
      actual,
      texto: {
        es: `Apilo los vecinos de <b>${nombre(actual)}</b>. El próximo en salir va a ser <b>el último que apilé</b>, así que sigue metiéndose para el mismo lado hasta que choque.`,
        en: `I push the neighbours of <b>${nombre(actual)}</b>. The next one out will be <b>the last one I pushed</b>, so it keeps burrowing the same way until it hits something.`,
      },
    });
  }

  return cerrar(pasos, terreno, previo, cerrados, {
    es: "El camino es el primero con el que se topó la pila. Que salga bueno o malo lo decide el tablero, no el algoritmo.",
    en: "The path is the first one the stack ran into. Whether it comes out good or bad is decided by the board, not by the algorithm.",
  });
}
