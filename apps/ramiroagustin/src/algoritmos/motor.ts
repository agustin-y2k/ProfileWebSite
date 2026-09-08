/**
 * Los cuatro algoritmos de búsqueda de caminos, con un contrato común.
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
 * óptimo, y comparar su recorrido con el de Dijkstra perdería sentido: estarían
 * resolviendo problemas distintos.
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

// ── Dijkstra ──────────────────────────────────────────────────────────────
export function correrDijkstra(terreno: Terreno[]): Paso[] {
  const pasos: Paso[] = [];
  const dist = new Map([[ORIGEN, 0]]);
  const previo = new Map<number, number>();
  const cerrados = new Set<number>();
  const cola: [number, number][] = [[ORIGEN, 0]];

  const frontera = () =>
    [...cola].sort((a, b) => a[1] - b[1]).map(([id, d]) => ({ id, texto: `d = ${d}` }));

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
      es: `Arranco en <b>${nombre(ORIGEN)}</b> con distancia <code>0</code>. Todo lo demás vale infinito hasta que se demuestre lo contrario.`,
      en: `I start at <b>${nombre(ORIGEN)}</b> with distance <code>0</code>. Everything else is worth infinity until proven otherwise.`,
    },
  });

  while (cola.length) {
    let mi = 0;
    for (let i = 1; i < cola.length; i++) if (cola[i]![1] < cola[mi]![1]) mi = i;
    const [actual, d] = cola.splice(mi, 1)[0]!;

    pasos.push({
      ...base(),
      linea: 8,
      actual,
      texto: {
        es: `Saco <b>${nombre(actual)}</b> con <code>d=${d}</code>: es el pendiente más barato de toda la cola.`,
        en: `I pop <b>${nombre(actual)}</b> with <code>d=${d}</code>: the cheapest pending cell in the whole queue.`,
      },
    });

    if (cerrados.has(actual)) {
      pasos.push({
        ...base(),
        linea: 9,
        actual,
        texto: {
          es: `A <b>${nombre(actual)}</b> ya lo había resuelto por un camino más barato. Lo salteo.`,
          en: `I had already settled <b>${nombre(actual)}</b> through a cheaper path. I skip it.`,
        },
      });
      continue;
    }

    cerrados.add(actual);
    pasos.push({
      ...base(),
      linea: 10,
      actual,
      cerrar: actual,
      texto: {
        es: `Cierro <b>${nombre(actual)}</b> y queda sellada: como salió siendo el mínimo, <b>ningún camino futuro puede mejorar su ${d}</b>. Eso es lo que hace correcto al algoritmo.`,
        en: `I close <b>${nombre(actual)}</b> and it is sealed: since it came out as the minimum, <b>no future path can improve on its ${d}</b>. That is what makes the algorithm correct.`,
      },
    });

    if (actual === DESTINO) {
      pasos.push({
        ...base(),
        linea: 11,
        actual,
        texto: {
          es: `Llegué al destino con costo <b>${d}</b>, y por lo de recién ya sé que es el más barato que existe.`,
          en: `I reached the target at cost <b>${d}</b>, and by what just happened I already know it is the cheapest one there is.`,
        },
      });
      break;
    }

    for (const v of vecinos(actual)) {
      if (!pasable(terreno, v)) continue;
      const costo = costoCelda(terreno, v);
      const cand = d + costo;
      const prev = dist.get(v) ?? Infinity;

      const tipo = TERRENO[terreno[v]!];
      const hoy = prev === Infinity ? "∞" : prev;

      pasos.push({
        ...base(),
        linea: 14,
        actual,
        texto: {
          es: `Vecino <b>${nombre(v)}</b> (${tipo.es}, cuesta ${costo}): llegar por acá sale <code>${d} + ${costo} = ${cand}</code>, y hoy tengo <code>${hoy}</code>.`,
          en: `Neighbour <b>${nombre(v)}</b> (${tipo.en}, costs ${costo}): getting there this way runs <code>${d} + ${costo} = ${cand}</code>, and right now I have <code>${hoy}</code>.`,
        },
      });

      if (cand < prev) {
        dist.set(v, cand);
        previo.set(v, actual);
        cola.push([v, cand]);
        pasos.push({
          ...base(),
          linea: 16,
          actual,
          etiqueta: { id: v, valor: cand },
          texto: {
            es: `Mejora. Anoto <code>${cand}</code> para <b>${nombre(v)}</b> y lo pongo en la cola.`,
            en: `That is an improvement. I write <code>${cand}</code> down for <b>${nombre(v)}</b> and push it onto the queue.`,
          },
        });
      }
    }
  }

  return cerrar(pasos, terreno, previo, cerrados, {
    es: "Camino reconstruido hacia atrás siguiendo <code>previo</code>.",
    en: "Path rebuilt backwards by following <code>cameFrom</code>.",
  });
}

// ── A* ────────────────────────────────────────────────────────────────────
export function correrAEstrella(terreno: Terreno[]): Paso[] {
  const pasos: Paso[] = [];
  const g = new Map([[ORIGEN, 0]]);
  const previo = new Map<number, number>();
  const cerrados = new Set<number>();
  const cola: [number, number][] = [[ORIGEN, heuristica(ORIGEN)]];

  const frontera = () =>
    [...cola]
      .sort((a, b) => a[1] - b[1])
      .map(([id, f]) => ({ id, texto: `f = ${g.get(id)} + ${heuristica(id)} = ${f}` }));

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
    texto: {
      es: `Igual que Dijkstra, pero la prioridad no es solo lo recorrido: es <code>f = g + h</code>, donde <b>h</b> estima lo que falta hasta el destino en línea recta.`,
      en: `Same as Dijkstra, except the priority is not just the ground covered: it is <code>f = g + h</code>, where <b>h</b> estimates what is left to the target in a straight line.`,
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
        es: `Saco <b>${nombre(actual)}</b>: <code>f = ${gAct} + ${heuristica(actual)} = ${f}</code>, el más prometedor. Fijate que prefiere las que apuntan al destino.`,
        en: `I pop <b>${nombre(actual)}</b>: <code>f = ${gAct} + ${heuristica(actual)} = ${f}</code>, the most promising one. Notice how it favours the cells pointing at the target.`,
      },
    });

    if (cerrados.has(actual)) continue;

    cerrados.add(actual);
    pasos.push({
      ...base(),
      linea: 11,
      actual,
      cerrar: actual,
      texto: {
        es: `Cierro <b>${nombre(actual)}</b> con <code>g=${gAct}</code>. Como <b>h</b> nunca sobreestima lo que falta, sigue valiendo la garantía: esta distancia es definitiva.`,
        en: `I close <b>${nombre(actual)}</b> with <code>g=${gAct}</code>. Since <b>h</b> never overestimates what is left, the guarantee still holds: this distance is final.`,
      },
    });

    if (actual === DESTINO) {
      pasos.push({
        ...base(),
        linea: 12,
        actual,
        texto: {
          es: `Llegué con costo <b>${gAct}</b> — el mismo que encuentra Dijkstra, pero abriendo muchas menos celdas.`,
          en: `I got there at cost <b>${gAct}</b> — the same one Dijkstra finds, but opening far fewer cells.`,
        },
      });
      break;
    }

    for (const v of vecinos(actual)) {
      if (!pasable(terreno, v)) continue;
      const cand = gAct + costoCelda(terreno, v);
      if (cand < (g.get(v) ?? Infinity)) {
        g.set(v, cand);
        previo.set(v, actual);
        cola.push([v, cand + heuristica(v)]);
        pasos.push({
          ...base(),
          linea: 17,
          actual,
          etiqueta: { id: v, valor: cand },
          texto: {
            es: `Encolo <b>${nombre(v)}</b> con <code>g=${cand}</code> y <code>h=${heuristica(v)}</code>: prioridad <b>${cand + heuristica(v)}</b>.`,
            en: `I queue <b>${nombre(v)}</b> with <code>g=${cand}</code> and <code>h=${heuristica(v)}</code>: priority <b>${cand + heuristica(v)}</b>.`,
          },
        });
      }
    }
  }

  return cerrar(pasos, terreno, previo, cerrados, {
    es: "Mismo camino que Dijkstra, encontrado mirando una fracción del tablero.",
    en: "The same path Dijkstra finds, reached by looking at a fraction of the board.",
  });
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
      es: `Una <b>cola</b> común: el primero que entra es el primero que sale. Para BFS todas las casillas valen igual — <b>no mira los costos</b>.`,
      en: `A plain <b>queue</b>: first in, first out. To BFS every square is worth the same — <b>it never looks at the costs</b>.`,
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
          es: `Llegué en <b>${profundidad.get(actual)} pasos</b>. Es el camino con menos casillas que existe — pero nadie dijo que fuera el más barato.`,
          en: `I got there in <b>${profundidad.get(actual)} steps</b>. It is the path with the fewest squares there is — but nobody said it was the cheapest.`,
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
          es: `Descubro <b>${nombre(v)}</b> y lo mando al final de la cola. No pregunto cuánto cuesta pisarlo: para BFS el barro y el camino son lo mismo.`,
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
      es: `Una <b>pila</b> en vez de una cola: sale el último que entró. Ese solo cambio hace que en vez de abrirse en círculos, se zambulla por un pasillo.`,
      en: `A <b>stack</b> instead of a queue: last in, first out. That single change is why it dives down one corridor instead of spreading out in circles.`,
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
          es: `Llegué. Pero el camino que traigo es el primero que apareció, no el mejor: DFS <b>no garantiza absolutamente nada</b> sobre su calidad.`,
          en: `I got there. But the path I carry is the first one that turned up, not the best one: DFS <b>guarantees absolutely nothing</b> about its quality.`,
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
        es: `Apilo los vecinos de <b>${nombre(actual)}</b>. El próximo en salir va a ser uno de estos, así que sigue metiéndose para el mismo lado.`,
        en: `I push the neighbours of <b>${nombre(actual)}</b>. The next one out will be one of these, so it keeps burrowing the same way.`,
      },
    });
  }

  return cerrar(pasos, terreno, previo, cerrados, {
    es: "Un camino cualquiera que llega, encontrado a los tumbos.",
    en: "Some path that happens to arrive, stumbled upon along the way.",
  });
}
