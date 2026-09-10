import { correrAEstrella, correrBFS, correrDFS, type Paso, type Terreno } from "./motor";
import type { PasoEscena } from "./escena";
import type { Frase, Idioma } from "../i18n/idioma";
import { correrDijkstra } from "./dijkstra";
import { correrSpanning } from "./spanning";
import { correrBellmanFord } from "./bellmanford";
import { correrHashing } from "./hashing";
import { correrTopologico } from "./topologico";
import { correrBinaria } from "./binaria";
import { correrUnionFind } from "./unionfind";
import { correrMinimax } from "./minimax";
import { correrGradiente } from "./gradiente";
import { correrKMeans } from "./kmeans";
import { LABERINTOS, TERRENOS } from "./escenarios";

/**
 * Los trece algoritmos de la sección, y todo lo que el visualizador necesita
 * saber de cada uno: qué es, en qué categoría entra, su listado de código, su
 * tesis y sus escenarios. Nada más.
 *
 * Esta lista es la única fuente de verdad. El índice de la página —las tres
 * categorías de cuatro— se deriva de acá y no se escribe aparte, así que no
 * puede quedar desfasado del selector: si un algoritmo existe, está en los
 * dos lados o en ninguno.
 *
 * Son trece definiciones para doce entradas del índice porque BFS y DFS
 * comparten una: recorrer con cola y recorrer con pila es un solo tema, y el
 * selector deja elegir cuál de los dos se mira.
 *
 * Ningún algoritmo declara «además entra en tal otra categoría». Entra en una,
 * se explica con el dibujo de esa, y listo — que no exista el campo es lo que
 * garantiza que nadie lo escriba de nuevo por inercia.
 *
 * Los números de línea de los pasos apuntan al `codigo` de acá, así que mover
 * una línea desincroniza el resaltado. Es la única atadura entre los motores y
 * la presentación, y es a propósito: el listado es parte de la explicación, no
 * documentación aparte que se puede editar sin consecuencias.
 */

export type Categoria = "redes" | "estructuras" | "ia";

export type Escenario = { id: string; nombre: Frase };

/**
 * El listado de código, traducido.
 *
 * Traducir los identificadores no es cosmética: el listado **es** la
 * explicación, y leer `previo.set(vecino, actual)` obliga a quien no habla
 * español a traducir mentalmente mientras intenta seguir una animación.
 *
 * Las dos versiones tienen que tener la misma cantidad de líneas y decir lo
 * mismo en cada una. Los pasos emiten un solo número de línea para los dos
 * idiomas, así que una versión corrida una línea deja el resaltado apuntando a
 * otra cosa en ese idioma — un error que no se ve leyendo el código, solo
 * mirando la página en inglés. Hay una prueba que compara los largos.
 */
export type Listado = Record<Idioma, string[]>;

type Base = {
  id: string;
  nombre: Frase;
  categoria: Categoria;
  /** Cómo aparece en el índice. Sin esto, no aparece: lo cubre otro. */
  indice?: { nombre: Frase; que: Frase };
  panel: Frase;
  tesis: Frase;
  codigo: Listado;
  escenarios: Escenario[];
};

/**
 * Dos familias, no dos jerarquías: la de la grilla recibe un tablero de
 * terreno y la otra el id del escenario. Es la única distinción que queda:
 * cada algoritmo se explica con el dibujo de su propia categoría y no depende
 * de que se lo mire al lado de otro.
 */
export type Definicion = Base &
  (
    | { familia: "grilla"; correr: (terreno: Terreno[], escenario: string) => Paso[] }
    | { familia: "escena"; correr: (escenario: string) => PasoEscena[] }
  );

const solo = (fuente: { id: string; nombre: Frase }[]): Escenario[] =>
  fuente.map((e) => ({ id: e.id, nombre: e.nombre }));

/** Con costos, para A*. Sin costos, para los dos que los ignoran. */
const CON_COSTO: Escenario[] = solo(TERRENOS);
const SIN_COSTO: Escenario[] = solo(LABERINTOS);

export const ALGORITMOS: Definicion[] = [
  // ── Redes e infraestructura ──────────────────────────────────────────────
  {
    id: "dijkstra",
    nombre: "Dijkstra",
    categoria: "redes",
    familia: "escena",
    correr: correrDijkstra,
    escenarios: [
      { id: "spf", nombre: { es: "El cálculo SPF", en: "The SPF calculation" } },
      {
        id: "anchodebanda",
        nombre: { es: "Costo por ancho de banda", en: "Cost from bandwidth" },
      },
      {
        id: "desincronizado",
        nombre: { es: "Mapa desactualizado", en: "A stale map" },
      },
    ],
    indice: {
      nombre: "Dijkstra",
      que: {
        es: "El cálculo SPF de OSPF e IS-IS: cada router arma el mapa del área y saca de ahí su tabla entera.",
        en: "The SPF calculation inside OSPF and IS-IS: every router builds the map of the area and derives its whole table from it.",
      },
    },
    panel: { es: "Listas TENT y PATH", en: "TENT and PATH lists" },
    tesis: {
      es: "Un router no le pregunta a nadie por dónde salir: junta los LSA de toda el área, arma el mapa completo y lo calcula solo. <em>Y no calcula un camino — cierra todos los destinos en orden de costo creciente, y la tabla de ruteo es lo que queda cuando terminó.</em>",
      en: "A router asks nobody which way to go: it collects the LSAs of the whole area, assembles the complete map and computes on its own. <em>And it does not compute a path — it settles every destination in order of increasing cost, and the routing table is what is left when it finishes.</em>",
    },
    codigo: {
      es: [
        "function spf(yo, lsdb) {",
        "  // El LSDB ya está completo: todos los routers del área",
        "  // inundaron sus LSA. SPF no le pregunta nada a nadie.",
        "  const costo = new Map([[yo, 0]]);",
        "  const salida = new Map();   // destino → primer salto",
        "  const tent = new ColaDePrioridad([[yo, 0]]);",
        "  const path = new Set();",
        "",
        "  while (!tent.vacia()) {",
        "    const r = tent.sacarMinimo();",
        "    if (path.has(r)) continue;",
        "    path.add(r);   // sellado: ya no se toca más",
        "",
        "    for (const [vecino, c] of lsdb.enlacesDe(r)) {",
        "      const candidata = costo.get(r) + c;",
        "      if (candidata < (costo.get(vecino) ?? Infinity)) {",
        "        costo.set(vecino, candidata);",
        "        salida.set(vecino, r === yo ? vecino : salida.get(r));",
        "        tent.insertar(vecino, candidata);",
        "      }",
        "    }",
        "  }",
        "  // No hay «llegué»: la tabla es para todos los destinos.",
        "  return tablaDeRuteo(costo, salida);",
        "}",
      ],
      en: [
        "function spf(me, lsdb) {",
        "  // The LSDB is already complete: every router in the area",
        "  // flooded its LSAs. SPF asks nobody anything.",
        "  const cost = new Map([[me, 0]]);",
        "  const exit = new Map();     // destination -> first hop",
        "  const tent = new PriorityQueue([[me, 0]]);",
        "  const path = new Set();",
        "",
        "  while (!tent.isEmpty()) {",
        "    const r = tent.popMin();",
        "    if (path.has(r)) continue;",
        "    path.add(r);   // sealed: never touched again",
        "",
        "    for (const [neighbour, c] of lsdb.linksFrom(r)) {",
        "      const candidate = cost.get(r) + c;",
        "      if (candidate < (cost.get(neighbour) ?? Infinity)) {",
        "        cost.set(neighbour, candidate);",
        "        exit.set(neighbour, r === me ? neighbour : exit.get(r));",
        "        tent.push(neighbour, candidate);",
        "      }",
        "    }",
        "  }",
        "  // There is no «I arrived»: the table covers every destination.",
        "  return routingTable(cost, exit);",
        "}",
      ],
    },
  },
  {
    id: "spanning",
    nombre: "Spanning Tree",
    categoria: "redes",
    familia: "escena",
    correr: correrSpanning,
    escenarios: [
      {
        id: "prioridad",
        nombre: { es: "Con la raíz configurada", en: "Root configured" },
      },
      {
        id: "sinprioridad",
        nombre: { es: "Como viene de fábrica", en: "Factory defaults" },
      },
      { id: "caida", nombre: { es: "Se cae un enlace", en: "A link goes down" } },
    ],
    indice: {
      nombre: "Spanning Tree",
      que: {
        es: "Lo que corre en todo switch administrable: elegir raíz y apagar puertos para romper bucles.",
        en: "What runs on every managed switch: elect a root and shut ports down to break loops.",
      },
    },
    panel: {
      es: "Switches y su costo a la raíz",
      en: "Switches and their cost to the root",
    },
    tesis: {
      es: "Un bucle en una red conmutada no la hace lenta: la hace <b>dejar de funcionar</b>, porque un solo broadcast da vueltas para siempre multiplicándose. <em>La solución es apagar puertos a propósito: se sacrifica capacidad para que la red exista.</em>",
      en: "A loop in a switched network does not make it slow: it makes it <b>stop working</b>, because a single broadcast frame circles forever, multiplying at every hop. <em>The fix is to shut ports down on purpose: capacity is sacrificed so that the network can exist at all.</em>",
    },
    codigo: {
      es: [
        "function spanningTree(switches, enlaces) {",
        "  // 1. Todos arrancan creyéndose la raíz y anunciándolo.",
        "  const raiz = menorBridgeId(switches);",
        "",
        "  // 2. Qué le cuesta a cada uno llegar hasta la raíz.",
        "  const costo = dijkstraDesde(raiz, enlaces);",
        "",
        "  // 3. Root port: el puerto por el que la raíz sale más barata.",
        "  for (const s of switches) {",
        "    if (s === raiz) continue;",
        "    s.rootPort = mejorEnlace(s, costo);   // empate → menor bridge ID",
        "  }",
        "",
        "  // 4. En cada enlace que sobra queda un solo designado.",
        "  for (const e of enlaces) {",
        "    if (esRootPort(e)) continue;",
        "    const designado = masCercaDeLaRaiz(e, costo);",
        "    bloquear(e, otroExtremo(e, designado));",
        "  }",
        "}",
      ],
      en: [
        "function spanningTree(switches, links) {",
        "  // 1. Every switch starts out believing it is the root, and says so.",
        "  const root = lowestBridgeId(switches);",
        "",
        "  // 2. What it costs each one to reach the root.",
        "  const cost = dijkstraFrom(root, links);",
        "",
        "  // 3. Root port: the port where the root comes out cheapest.",
        "  for (const s of switches) {",
        "    if (s === root) continue;",
        "    s.rootPort = bestLink(s, cost);       // tie -> lower bridge ID",
        "  }",
        "",
        "  // 4. On every leftover link exactly one designated side remains.",
        "  for (const l of links) {",
        "    if (isRootPort(l)) continue;",
        "    const designated = closerToRoot(l, cost);",
        "    block(l, otherEnd(l, designated));",
        "  }",
        "}",
      ],
    },
  },
  {
    id: "bellmanford",
    nombre: "Bellman-Ford",
    categoria: "redes",
    familia: "escena",
    correr: correrBellmanFord,
    escenarios: [
      {
        id: "converge",
        nombre: { es: "Aprendiendo la red", en: "Learning the network" },
      },
      { id: "cuenta", nombre: { es: "Se cae el enlace", en: "The link goes down" } },
      {
        id: "splithorizon",
        nombre: { es: "Con split horizon", en: "With split horizon" },
      },
    ],
    indice: {
      nombre: "Bellman-Ford",
      que: {
        es: "RIP, y con él el problema de «cuenta hasta infinito» que lo hace converger lento.",
        en: "RIP, and with it the count-to-infinity problem that makes it converge so slowly.",
      },
    },
    panel: {
      es: "Tabla de ruteo de cada router",
      en: "Each router's routing table",
    },
    tesis: {
      es: "Acá nadie conoce el mapa: cada router solo habla con sus vecinos y solo sabe lo que ellos le cuentan. <em>Esa es su gracia y su desgracia, porque nadie verifica nada — y cuando la noticia es mala, se creen entre ellos rutas que ya no existen.</em>",
      en: "Nobody here knows the map: each router only ever talks to its neighbours and only knows what they tell it. <em>That is its charm and its curse, because nobody verifies anything, and when the news is bad they believe each other about routes that no longer exist.</em>",
    },
    codigo: {
      es: [
        "function vectorDistancia(yo, vecinos) {",
        "  // Todo lo que sé de esa red: a cuántos saltos está y por quién.",
        "  let dist = INALCANZABLE, via = null;",
        "",
        "  cada30Segundos(() => {",
        "    // 1. Les cuento a mis vecinos lo que creo saber.",
        "    for (const v of vecinos) v.recibir(yo, dist);",
        "",
        "    // 2. Me quedo con la mejor promesa que me hicieron.",
        "    //    Nadie verifica nada: si mi vecino se equivoca,",
        "    //    yo repito su error un salto más caro.",
        "    [dist, via] = mejorDe(vecinos.map((v) => [v.promesa + 1, v]));",
        "",
        "    // 3. Y si el cable se corta, lo noto solo yo.",
        "    if (!via?.enlace.activo) dist = INALCANZABLE;",
        "  });",
        "}",
      ],
      en: [
        "function distanceVector(me, neighbours) {",
        "  // All I know about that network: how many hops, and through whom.",
        "  let dist = UNREACHABLE, via = null;",
        "",
        "  every30Seconds(() => {",
        "    // 1. I tell my neighbours whatever I believe I know.",
        "    for (const n of neighbours) n.hear(me, dist);",
        "",
        "    // 2. I keep the best promise anyone made me.",
        "    //    Nobody verifies anything: if my neighbour is wrong,",
        "    //    I repeat his mistake one hop more expensively.",
        "    [dist, via] = bestOf(neighbours.map((n) => [n.promise + 1, n]));",
        "",
        "    // 3. And if the cable is cut, I am the only one who notices.",
        "    if (!via?.link.up) dist = UNREACHABLE;",
        "  });",
        "}",
      ],
    },
  },
  {
    id: "hashing",
    nombre: { es: "Hashing consistente", en: "Consistent hashing" },
    categoria: "redes",
    familia: "escena",
    correr: correrHashing,
    escenarios: [
      { id: "caida", nombre: { es: "Se cae un servidor", en: "A server goes down" } },
      { id: "modulo", nombre: { es: "Dividiendo por N", en: "Dividing by N" } },
      {
        id: "sinvirtuales",
        nombre: { es: "Sin nodos virtuales", en: "No virtual nodes" },
      },
    ],
    indice: {
      nombre: { es: "Hashing consistente", en: "Consistent hashing" },
      que: {
        es: "Cómo un balanceador reparte carga, y por qué al caerse un nodo solo se mueve 1/N.",
        en: "How a load balancer spreads work, and why losing one node moves only 1/N of it.",
      },
    },
    panel: { es: "Carga por servidor", en: "Load per server" },
    tesis: {
      es: "Todo el truco es <b>no dividir por la cantidad de servidores</b>. Con <code>hash % N</code>, cambiar N le cambia el dueño a casi todas las claves; <em>en un caché eso es perderlo entero de golpe, y en una base repartida, mover todos los datos.</em>",
      en: "The whole trick is <b>not dividing by the number of servers</b>. With <code>hash % N</code>, changing N changes the owner of nearly every key; <em>in a cache that means losing the lot at once, and in a distributed database, moving all of the data.</em>",
    },
    codigo: {
      es: [
        "// Lo que uno escribe primero:",
        "//   servidor = servidores[hash(clave) % servidores.length]",
        "// Anda perfecto hasta el día en que servidores.length cambia.",
        "",
        "function ubicar(clave, anillo) {",
        "  const punto = hash(clave);        // un lugar del círculo, no un índice",
        "",
        "  // El dueño es el primer nodo que aparece caminando en un sentido.",
        "  for (const nodo of anillo.ordenados()) {",
        "    if (nodo.punto >= punto) return nodo.servidor;",
        "  }",
        "  return anillo.primero().servidor; // se dio la vuelta entera",
        "}",
        "// Sacar un servidor solo reasigna las claves de los tramos que cubría:",
        "function sacar(servidor, anillo) {",
        "  for (const v of servidor.virtuales) anillo.quitar(v);",
        "}",
      ],
      en: [
        "// What everyone writes first:",
        "//   server = servers[hash(key) % servers.length]",
        "// Works perfectly until the day servers.length changes.",
        "",
        "function locate(key, ring) {",
        "  const point = hash(key);          // a spot on the circle, not an index",
        "",
        "  // The owner is the first node you meet walking one way around.",
        "  for (const node of ring.sorted()) {",
        "    if (node.point >= point) return node.server;",
        "  }",
        "  return ring.first().server;       // wrapped all the way around",
        "}",
        "// Removing a server only reassigns the keys of the arcs it covered:",
        "function remove(server, ring) {",
        "  for (const v of server.virtualNodes) ring.drop(v);",
        "}",
      ],
    },
  },

  // ── Estructuras y recorridos ─────────────────────────────────────────────
  {
    id: "bfs",
    nombre: "BFS",
    categoria: "estructuras",
    familia: "grilla",
    correr: correrBFS,
    escenarios: SIN_COSTO,
    indice: {
      nombre: { es: "BFS y DFS", en: "BFS and DFS" },
      que: {
        es: "Cambiar una cola por una pila da vuelta el comportamiento entero.",
        en: "Swapping a queue for a stack turns the entire behaviour inside out.",
      },
    },
    panel: {
      es: "Cola · entra por atrás, sale por adelante",
      en: "Queue · in at the back, out at the front",
    },
    tesis: {
      es: "Una cola, y nada más: el primero que entra es el primero que sale. <em>De ahí sale todo lo demás — explora por anillos, así que la primera vez que toca el destino ya llegó por el camino de menos casillas que existe.</em>",
      en: "A queue, and nothing else: first in, first out. <em>Everything else follows from that — it explores in rings, so the first time it touches the target it has already arrived by the shortest path there is.</em>",
    },
    codigo: {
      es: [
        "function bfs(origen, destino) {",
        "  const previo = new Map();",
        "  const vistos = new Set([origen]);",
        "  const cola = [origen];   // FIFO",
        "",
        "  while (cola.length) {",
        "    const actual = cola.shift();",
        "    if (actual === destino) break;",
        "",
        "    for (const vecino of vecinos(actual)) {",
        "      if (!pasable(vecino) || vistos.has(vecino)) continue;",
        "      vistos.add(vecino);",
        "      previo.set(vecino, actual);",
        "      cola.push(vecino);",
        "    }",
        "  }",
        "  return reconstruir(previo, destino);",
        "}",
      ],
      en: [
        "function bfs(source, target) {",
        "  const cameFrom = new Map();",
        "  const seen = new Set([source]);",
        "  const queue = [source];  // FIFO",
        "",
        "  while (queue.length) {",
        "    const current = queue.shift();",
        "    if (current === target) break;",
        "",
        "    for (const next of neighbours(current)) {",
        "      if (!passable(next) || seen.has(next)) continue;",
        "      seen.add(next);",
        "      cameFrom.set(next, current);",
        "      queue.push(next);",
        "    }",
        "  }",
        "  return rebuild(cameFrom, target);",
        "}",
      ],
    },
  },
  {
    id: "dfs",
    nombre: "DFS",
    categoria: "estructuras",
    familia: "grilla",
    correr: correrDFS,
    escenarios: SIN_COSTO,
    panel: {
      es: "Pila · entra y sale por el mismo lado",
      en: "Stack · in and out through the same end",
    },
    tesis: {
      es: "La misma función con una pila en lugar de una cola. <em>En vez de abrirse en anillos se zambulle por un pasillo y solo vuelve cuando choca. Llega, y a veces mirando poquísimo — pero el camino que trae no tiene ninguna garantía, y en «La bifurcación» se ve exactamente cuánto.</em>",
      en: "The same function with a stack where the queue was. <em>Instead of spreading in rings it dives down a corridor and only turns back when it hits a wall. It arrives, sometimes after looking at very little — but the path it brings carries no guarantee at all, and «The fork» shows exactly how little.</em>",
    },
    codigo: {
      es: [
        "function dfs(origen, destino) {",
        "  const previo = new Map();",
        "  const vistos = new Set();",
        "  const pila = [origen];   // LIFO",
        "",
        "  while (pila.length) {",
        "    const actual = pila.pop();",
        "    if (vistos.has(actual)) continue;",
        "    vistos.add(actual);",
        "    if (actual === destino) break;",
        "",
        "    for (const vecino of vecinos(actual)) {",
        "      if (!pasable(vecino) || vistos.has(vecino)) continue;",
        "      if (!previo.has(vecino)) previo.set(vecino, actual);",
        "      pila.push(vecino);",
        "    }",
        "  }",
        "  return reconstruir(previo, destino);",
        "}",
      ],
      en: [
        "function dfs(source, target) {",
        "  const cameFrom = new Map();",
        "  const seen = new Set();",
        "  const stack = [source];  // LIFO",
        "",
        "  while (stack.length) {",
        "    const current = stack.pop();",
        "    if (seen.has(current)) continue;",
        "    seen.add(current);",
        "    if (current === target) break;",
        "",
        "    for (const next of neighbours(current)) {",
        "      if (!passable(next) || seen.has(next)) continue;",
        "      if (!cameFrom.has(next)) cameFrom.set(next, current);",
        "      stack.push(next);",
        "    }",
        "  }",
        "  return rebuild(cameFrom, target);",
        "}",
      ],
    },
  },
  {
    id: "topologico",
    nombre: { es: "Orden topológico", en: "Topological sort" },
    categoria: "estructuras",
    familia: "escena",
    correr: correrTopologico,
    escenarios: [
      { id: "repo", nombre: { es: "Este repositorio", en: "This repository" } },
      { id: "pila", nombre: { es: "Con una pila", en: "With a stack" } },
      { id: "ciclo", nombre: { es: "Con un ciclo", en: "With a cycle" } },
    ],
    indice: {
      nombre: { es: "Orden topológico", en: "Topological sort" },
      que: {
        es: "Resolución de dependencias: lo que hace pnpm con este mismo repositorio.",
        en: "Dependency resolution: what pnpm does with this very repository.",
      },
    },
    panel: { es: "A cuántos espera cada uno", en: "How many each one waits for" },
    tesis: {
      es: "Poner en fila cosas que solo saben <b>a quién necesitan</b>, no en qué momento van. <em>El grafo de acá no es de ejemplo: son los seis paquetes de este repositorio y las dependencias que declaran sus package.json.</em>",
      en: "Putting into a line things that only know <b>who they need</b>, not when their turn is. <em>The graph here is not a toy: it is the six packages of this repository and the dependencies their package.json files declare.</em>",
    },
    codigo: {
      es: [
        "function ordenTopologico(paquetes, dependencias) {",
        "  // Cuántas cosas tiene que esperar cada paquete.",
        "  const grado = new Map(paquetes.map((p) => [p, 0]));",
        "  for (const [, dependiente] of dependencias) grado[dependiente]++;",
        "",
        "  // Los que no esperan a nadie pueden empezar ya.",
        "  const listos = paquetes.filter((p) => grado[p] === 0);",
        "  const orden = [];",
        "",
        "  while (listos.length) {",
        "    const p = listos.shift();   // con una pila sale otro orden, igual de válido",
        "    orden.push(p);",
        "",
        "    // Al terminar p, sus dependientes esperan a uno menos.",
        "    for (const d of dependientesDe(p)) {",
        "      if (--grado[d] === 0) listos.push(d);",
        "    }",
        "  }",
        "",
        "  // Si sobró alguno, es que se esperan entre ellos.",
        "  if (orden.length < paquetes.length) throw new Error('dependencia circular');",
        "  return orden;",
        "}",
      ],
      en: [
        "function topologicalSort(packages, dependencies) {",
        "  // How many things each package has to wait for.",
        "  const degree = new Map(packages.map((p) => [p, 0]));",
        "  for (const [, dependent] of dependencies) degree[dependent]++;",
        "",
        "  // The ones waiting for nobody can start right now.",
        "  const ready = packages.filter((p) => degree[p] === 0);",
        "  const order = [];",
        "",
        "  while (ready.length) {",
        "    const p = ready.shift();    // a stack gives another order, just as valid",
        "    order.push(p);",
        "",
        "    // Once p is finished, its dependents wait for one fewer.",
        "    for (const d of dependentsOf(p)) {",
        "      if (--degree[d] === 0) ready.push(d);",
        "    }",
        "  }",
        "",
        "  // Anything left over means they are waiting for each other.",
        "  if (order.length < packages.length) throw new Error('circular dependency');",
        "  return order;",
        "}",
      ],
    },
  },
  {
    id: "binaria",
    nombre: { es: "Búsqueda binaria", en: "Binary search" },
    categoria: "estructuras",
    familia: "escena",
    correr: correrBinaria,
    escenarios: [
      { id: "esta", nombre: { es: "Está", en: "It is there" } },
      { id: "noesta", nombre: { es: "No está", en: "It is not there" } },
      { id: "desordenado", nombre: { es: "Mal ordenado", en: "Wrongly sorted" } },
    ],
    indice: {
      nombre: { es: "Búsqueda binaria", en: "Binary search" },
      que: {
        es: "Un millón de elementos en veinte pasos, y el desbordamiento que casi nadie ve.",
        en: "A million elements in twenty steps, and the overflow almost nobody sees.",
      },
    },
    panel: { es: "El rango que queda", en: "The range that is left" },
    tesis: {
      es: "Cada paso tira la mitad de lo que queda, y eso no se entiende leyéndolo: se entiende viendo cuánto arreglo se apaga de golpe. <em>Tiene una precondición que nadie verifica, y cuando no se cumple no falla — contesta mal, con la misma seguridad.</em>",
      en: "Every step throws away half of what is left, and you do not get that from reading it: you get it from watching how much of the array goes dark at once. <em>It has a precondition nobody checks, and when it does not hold it does not fail — it answers wrongly, with exactly the same confidence.</em>",
    },
    codigo: {
      es: [
        "function binaria(arreglo, objetivo) {",
        "  let lo = 0, hi = arreglo.length - 1;",
        "",
        "  while (lo <= hi) {",
        "    // No (lo + hi) / 2: con arreglos grandes eso se desborda. Fue un",
        "    // bug real en la biblioteca estándar de Java, y duró nueve años.",
        "    const medio = lo + Math.floor((hi - lo) / 2);",
        "",
        "    if (arreglo[medio] === objetivo) return medio;",
        "    if (arreglo[medio] < objetivo) lo = medio + 1;  // sobra la mitad de abajo",
        "    else hi = medio - 1;                            // sobra la de arriba",
        "  }",
        "",
        "  return -1;   // se cruzaron: no está",
        "}",
      ],
      en: [
        "function binarySearch(array, target) {",
        "  let lo = 0, hi = array.length - 1;",
        "",
        "  while (lo <= hi) {",
        "    // Not (lo + hi) / 2: on large arrays that overflows. It was a real",
        "    // bug in Java's standard library, and it lived there for nine years.",
        "    const mid = lo + Math.floor((hi - lo) / 2);",
        "",
        "    if (array[mid] === target) return mid;",
        "    if (array[mid] < target) lo = mid + 1;          // lower half is useless",
        "    else hi = mid - 1;                              // so is the upper one",
        "  }",
        "",
        "  return -1;   // they crossed: it is not there",
        "}",
      ],
    },
  },
  {
    id: "unionfind",
    nombre: "Union-Find",
    categoria: "estructuras",
    familia: "escena",
    correr: correrUnionFind,
    escenarios: [
      {
        id: "ingenuo",
        nombre: { es: "Sin unión por tamaño", en: "Without union by size" },
      },
      { id: "tamano", nombre: { es: "Unión por tamaño", en: "Union by size" } },
      {
        id: "compresion",
        nombre: { es: "Y compresión de caminos", en: "And path compression" },
      },
    ],
    indice: {
      nombre: "Union-Find",
      que: {
        es: "La compresión de caminos aplanando los árboles en vivo.",
        en: "Path compression flattening the trees before your eyes.",
      },
    },
    panel: { es: "Los conjuntos", en: "The sets" },
    tesis: {
      es: "Contesta una sola pregunta —<b>¿estos dos ya están conectados?</b>— y es el ejemplo más limpio que existe de <em>dos optimizaciones de una línea cada una que cambian la complejidad de la estructura entera</em>.",
      en: "It answers a single question — <b>are these two already connected?</b> — and it is the cleanest example there is of <em>two one-line optimisations that change the complexity of the entire structure</em>.",
    },
    codigo: {
      es: [
        "function buscar(x) {",
        "  // Subo hasta la raíz: la raíz es la identidad del conjunto.",
        "  if (padre[x] !== x) {",
        "    padre[x] = buscar(padre[x]);   // compresión: lo cuelgo de la raíz",
        "  }",
        "  return padre[x];",
        "}",
        "",
        "function unir(a, b) {",
        "  let ra = buscar(a), rb = buscar(b);",
        "  if (ra === rb) return false;     // ya estaban juntos: sería un bucle",
        "",
        "  // El chico se cuelga del grande, nunca al revés.",
        "  if (tam[ra] < tam[rb]) [ra, rb] = [rb, ra];",
        "  padre[rb] = ra;",
        "  tam[ra] += tam[rb];",
        "  return true;",
        "}",
      ],
      en: [
        "function find(x) {",
        "  // Climb to the root: the root is the identity of the set.",
        "  if (parent[x] !== x) {",
        "    parent[x] = find(parent[x]);   // compression: hang it off the root",
        "  }",
        "  return parent[x];",
        "}",
        "",
        "function union(a, b) {",
        "  let ra = find(a), rb = find(b);",
        "  if (ra === rb) return false;     // already together: this would be a loop",
        "",
        "  // The small one hangs off the big one, never the other way round.",
        "  if (size[ra] < size[rb]) [ra, rb] = [rb, ra];",
        "  parent[rb] = ra;",
        "  size[ra] += size[rb];",
        "  return true;",
        "}",
      ],
    },
  },

  // ── IA y búsqueda ────────────────────────────────────────────────────────
  {
    id: "astar",
    nombre: "A*",
    categoria: "ia",
    familia: "grilla",
    correr: correrAEstrella,
    escenarios: CON_COSTO,
    indice: {
      nombre: "A*",
      que: {
        es: "Búsqueda informada: la heurística que evita mirar para el lado equivocado, y lo que se rompe cuando exagera.",
        en: "Informed search: the heuristic that stops it looking the wrong way, and what breaks when it overshoots.",
      },
    },
    panel: { es: "Cola de prioridad · f = g + h", en: "Priority queue · f = g + h" },
    tesis: {
      es: "Prioriza por <code>f = g + h</code>: lo que ya gastó más una corazonada de cuánto falta en línea recta. <em>Mientras esa corazonada no se pase —y no puede, porque ninguna casilla cuesta menos de 1— el camino que devuelve es el óptimo. En cuanto se pasa, sigue llegando, sigue pareciendo que funciona, y deja de ser el mejor.</em>",
      en: "It prioritises by <code>f = g + h</code>: what it has already spent plus a hunch about how far is left as the crow flies. <em>As long as that hunch never overshoots —and it cannot, since no square costs less than 1— the path it returns is optimal. The moment it does overshoot, it still arrives, still looks like it works, and stops being the best.</em>",
    },
    codigo: {
      es: [
        "function aEstrella(origen, destino) {",
        "  const g = new Map([[origen, 0]]);",
        "  const previo = new Map();",
        "  // Prioridad: g + peso·h. Con peso 1 la corazonada nunca miente.",
        "  const cola = new ColaDePrioridad([[origen, peso * h(origen)]]);",
        "  const cerrados = new Set();",
        "",
        "  while (!cola.vacia()) {",
        "    const actual = cola.sacarMinimo();",
        "    if (cerrados.has(actual)) continue;",
        "    cerrados.add(actual);",
        "    if (actual === destino) break;",
        "",
        "    for (const vecino of vecinos(actual)) {",
        "      const candidata = g.get(actual) + costo(vecino);",
        "      if (candidata < (g.get(vecino) ?? Infinity)) {",
        "        g.set(vecino, candidata);",
        "        previo.set(vecino, actual);",
        "        cola.insertar(vecino, candidata + peso * h(vecino));",
        "      }",
        "    }",
        "  }",
        "  return reconstruir(previo, destino);",
        "}",
      ],
      en: [
        "function aStar(source, target) {",
        "  const g = new Map([[source, 0]]);",
        "  const cameFrom = new Map();",
        "  // Priority: g + weight·h. At weight 1 the hunch never lies.",
        "  const queue = new PriorityQueue([[source, weight * h(source)]]);",
        "  const settled = new Set();",
        "",
        "  while (!queue.isEmpty()) {",
        "    const current = queue.popMin();",
        "    if (settled.has(current)) continue;",
        "    settled.add(current);",
        "    if (current === target) break;",
        "",
        "    for (const next of neighbours(current)) {",
        "      const candidate = g.get(current) + cost(next);",
        "      if (candidate < (g.get(next) ?? Infinity)) {",
        "        g.set(next, candidate);",
        "        cameFrom.set(next, current);",
        "        queue.push(next, candidate + weight * h(next));",
        "      }",
        "    }",
        "  }",
        "  return rebuild(cameFrom, target);",
        "}",
      ],
    },
  },
  {
    id: "minimax",
    nombre: { es: "Minimax con poda", en: "Minimax with pruning" },
    categoria: "ia",
    familia: "escena",
    correr: correrMinimax,
    escenarios: [
      { id: "poda", nombre: { es: "Con poda alfa-beta", en: "With alpha-beta pruning" } },
      { id: "malorden", nombre: { es: "Mal ordenado", en: "Badly ordered" } },
      { id: "sinpoda", nombre: { es: "Sin poda", en: "No pruning" } },
    ],
    indice: {
      nombre: {
        es: "Minimax con poda alfa-beta",
        en: "Minimax with alpha-beta pruning",
      },
      que: {
        es: "El árbol de juego, y las ramas que la poda descarta sin llegar a mirarlas.",
        en: "The game tree, and the branches pruning throws away without ever looking at them.",
      },
    },
    panel: { es: "Hojas evaluadas", en: "Leaves evaluated" },
    tesis: {
      es: "Yo maximizo, el rival minimiza, y así hasta el final de la partida. <em>La poda no es una aproximación: descarta ramas demostrando que no pueden cambiar la respuesta, así que devuelve exactamente la misma jugada que mirarlo todo.</em>",
      en: "I maximise, my opponent minimises, and so on to the end of the game. <em>Pruning is not an approximation: it discards branches by proving they cannot change the answer, so it returns exactly the same move as looking at everything.</em>",
    },
    codigo: {
      es: [
        "function alfaBeta(nodo, alfa, beta) {",
        "  if (nodo.esHoja) return evaluar(nodo);",
        "",
        "  if (nodo.turno === MAX) {",
        "    let mejor = -Infinity;",
        "    for (const hijo of nodo.hijos) {",
        "      mejor = Math.max(mejor, alfaBeta(hijo, alfa, beta));",
        "      alfa = Math.max(alfa, mejor);",
        "      if (alfa >= beta) break;   // el rival nunca me va a dejar llegar acá",
        "    }",
        "    return mejor;",
        "  }",
        "",
        "  let peor = Infinity;",
        "  for (const hijo of nodo.hijos) {",
        "    peor = Math.min(peor, alfaBeta(hijo, alfa, beta));",
        "    beta = Math.min(beta, peor);",
        "    if (beta <= alfa) break;     // yo nunca voy a elegir esta rama",
        "  }",
        "  return peor;",
        "}",
      ],
      en: [
        "function alphaBeta(node, alpha, beta) {",
        "  if (node.isLeaf) return evaluate(node);",
        "",
        "  if (node.turn === MAX) {",
        "    let best = -Infinity;",
        "    for (const child of node.children) {",
        "      best = Math.max(best, alphaBeta(child, alpha, beta));",
        "      alpha = Math.max(alpha, best);",
        "      if (alpha >= beta) break;  // my opponent will never let me get here",
        "    }",
        "    return best;",
        "  }",
        "",
        "  let worst = Infinity;",
        "  for (const child of node.children) {",
        "    worst = Math.min(worst, alphaBeta(child, alpha, beta));",
        "    beta = Math.min(beta, worst);",
        "    if (beta <= alpha) break;    // I am never going to pick this branch",
        "  }",
        "  return worst;",
        "}",
      ],
    },
  },
  {
    id: "gradiente",
    nombre: { es: "Descenso de gradiente", en: "Gradient descent" },
    categoria: "ia",
    familia: "escena",
    correr: correrGradiente,
    escenarios: [
      { id: "justo", nombre: { es: "Paso justo", en: "A well-chosen step" } },
      {
        id: "local",
        nombre: { es: "Del lado equivocado", en: "Starting on the wrong side" },
      },
      { id: "grande", nombre: { es: "Paso demasiado grande", en: "Step far too large" } },
    ],
    indice: {
      nombre: { es: "Descenso de gradiente", en: "Gradient descent" },
      que: {
        es: "La bolita bajando la superficie de error: lo que entrena toda red neuronal.",
        en: "The ball rolling down the error surface: what trains every neural network.",
      },
    },
    panel: { es: "Dónde está parada la bolita", en: "Where the ball is standing" },
    tesis: {
      es: "Entrenar un modelo es esto y nada más: mirar cuánto baja el suelo bajo los pies y dar un paso en contra de la pendiente. <em>El algoritmo no ve la curva. Solo sabe qué tan inclinado está el piso donde está parado.</em>",
      en: "Training a model is this and nothing more: check how steeply the ground falls away beneath your feet, then step against the slope. <em>The algorithm cannot see the curve. It only knows how tilted the floor is where it happens to be standing.</em>",
    },
    codigo: {
      es: [
        "function descenso(f, df, x, paso) {",
        "  for (let i = 0; i < 10000; i++) {",
        "    // La pendiente donde estoy parado. Es lo único que puedo ver:",
        "    // no conozco la curva, solo el suelo bajo mis pies.",
        "    const pendiente = df(x);",
        "",
        "    // Bajar es ir en contra de la pendiente. De ahí el menos.",
        "    x = x - paso * pendiente;",
        "",
        "    if (Math.abs(pendiente) < 0.01) break;   // el suelo se puso plano",
        "  }",
        "  return x;",
        "}",
      ],
      en: [
        "function descent(f, df, x, step) {",
        "  for (let i = 0; i < 10000; i++) {",
        "    // The slope where I am standing. It is all I can see:",
        "    // I do not know the curve, only the ground under my feet.",
        "    const slope = df(x);",
        "",
        "    // Going down means going against the slope. Hence the minus.",
        "    x = x - step * slope;",
        "",
        "    if (Math.abs(slope) < 0.01) break;       // the ground went flat",
        "  }",
        "  return x;",
        "}",
      ],
    },
  },
  {
    id: "kmeans",
    nombre: "k-means",
    categoria: "ia",
    familia: "escena",
    correr: correrKMeans,
    escenarios: [
      { id: "natural", nombre: { es: "Tres grupos", en: "Three clusters" } },
      {
        id: "malarranque",
        nombre: { es: "Arranque desafortunado", en: "An unlucky start" },
      },
      { id: "kdos", nombre: { es: "Le pido dos grupos", en: "Asking for two clusters" } },
    ],
    indice: {
      nombre: "k-means",
      que: {
        es: "Los centroides moviéndose hasta que los grupos se acomodan solos.",
        en: "The centroids moving until the clusters settle on their own.",
      },
    },
    panel: { es: "Los grupos", en: "The clusters" },
    tesis: {
      es: "Agrupar sin que nadie diga qué es cada grupo: no hay respuestas correctas en ninguna parte, solo puntos. <em>Siempre termina y siempre devuelve k grupos. Que sean los grupos que hay es otra cosa.</em>",
      en: "Grouping without anyone saying what each group is: there are no right answers anywhere, only points. <em>It always terminates and always returns k clusters. Whether those are the clusters that exist is another matter entirely.</em>",
    },
    codigo: {
      es: [
        "function kMeans(puntos, k) {",
        "  let centros = elegirInicio(puntos, k);",
        "",
        "  while (true) {",
        "    // 1. Cada punto se anota en el grupo del centro más cercano.",
        "    for (const p of puntos) {",
        "      p.grupo = masCercano(p, centros);",
        "    }",
        "",
        "    // 2. Cada centro se muda al promedio de los suyos.",
        "    const nuevos = centros.map((_, g) => promedio(puntos, g));",
        "",
        "    // 3. Si nadie se movió, terminó. Y siempre termina.",
        "    if (igual(nuevos, centros)) break;",
        "    centros = nuevos;",
        "  }",
        "  return centros;",
        "}",
      ],
      en: [
        "function kMeans(points, k) {",
        "  let centres = pickStart(points, k);",
        "",
        "  while (true) {",
        "    // 1. Each point joins the cluster of the nearest centre.",
        "    for (const p of points) {",
        "      p.cluster = nearest(p, centres);",
        "    }",
        "",
        "    // 2. Each centre moves to the average of its own points.",
        "    const moved = centres.map((_, c) => average(points, c));",
        "",
        "    // 3. If nobody moved, it is done. And it always finishes.",
        "    if (same(moved, centres)) break;",
        "    centres = moved;",
        "  }",
        "  return centres;",
        "}",
      ],
    },
  },
];

export const porId = (id: string) => ALGORITMOS.find((a) => a.id === id)!;

/** Las tres categorías, con su nombre y su intro. El orden es el de la página. */
export const CATEGORIAS: { id: Categoria; nombre: Frase; intro: Frase }[] = [
  {
    id: "redes",
    nombre: { es: "Redes e infraestructura", en: "Networking and infrastructure" },
    intro: {
      es: "Los que corren de verdad en el equipamiento que sostiene una red.",
      en: "The ones that actually run on the equipment holding a network up.",
    },
  },
  {
    id: "estructuras",
    nombre: { es: "Estructuras y recorridos", en: "Data structures and traversal" },
    intro: {
      es: "El oficio: recorrer, ordenar y buscar sobre datos con forma.",
      en: "The craft: walking, ordering and searching over data that has a shape.",
    },
  },
  {
    id: "ia",
    nombre: { es: "IA y búsqueda", en: "AI and search" },
    intro: {
      es: "De la búsqueda con corazonada al aprendizaje sin supervisión.",
      en: "From search with a hunch to learning with no supervision.",
    },
  },
];

export const deCategoria = (c: Categoria) => ALGORITMOS.filter((a) => a.categoria === c);
