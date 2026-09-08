import type { Frase } from "../i18n/idioma";
import type {
  AristaGrafo,
  EscenaGrafo,
  ItemPanel,
  NodoGrafo,
  PasoEscena,
} from "./escena";

/**
 * Spanning Tree (802.1D), el algoritmo que corre en todo switch administrable.
 *
 * El problema que resuelve no es de rendimiento: es que una red con un bucle
 * físico no funciona en absoluto. Una sola trama de broadcast da vueltas para
 * siempre, se multiplica en cada switch y en segundos no pasa nada más. Por
 * eso la solución es apagar puertos a propósito: se sacrifica capacidad para
 * que la red exista.
 *
 * Lo que se dibuja es la elección entera, con sus dos desempates reales —costo
 * a la raíz primero, bridge ID después—, porque son justo los que hacen que el
 * resultado no dependa de quién arrancó antes.
 */

type Suiche = {
  id: string;
  prioridad: number;
  mac: string;
  x: number;
  y: number;
};

type Cable = { a: string; b: string; costo: number; curva?: number };

/**
 * La red de ejemplo: seis switches y ocho cables, con tres bucles. Cinco
 * cables van a quedar en el árbol y tres puertos apagados, que es exactamente
 * lo que dice la cuenta: un árbol de N nodos tiene N-1 aristas.
 *
 * Los costos son los de 802.1D de verdad: 4 para un enlace de 1 Gb y 19 para
 * uno de 100 Mb. No son un número inventado para que el ejemplo salga lindo.
 */
const SUICHES: Suiche[] = [
  { id: "A", prioridad: 32768, mac: "aa:11", x: 20, y: 18 },
  { id: "B", prioridad: 4096, mac: "bb:22", x: 50, y: 10 },
  { id: "C", prioridad: 32768, mac: "cc:33", x: 80, y: 18 },
  { id: "D", prioridad: 32768, mac: "dd:44", x: 16, y: 76 },
  { id: "E", prioridad: 32768, mac: "ee:55", x: 50, y: 88 },
  { id: "F", prioridad: 32768, mac: "0a:99", x: 84, y: 76 },
];

const CABLES: Cable[] = [
  { a: "A", b: "B", costo: 4 },
  { a: "B", b: "C", costo: 4 },
  { a: "A", b: "C", costo: 19, curva: -16 },
  { a: "A", b: "D", costo: 19 },
  { a: "B", b: "E", costo: 4 },
  { a: "C", b: "F", costo: 19 },
  { a: "D", b: "E", costo: 19 },
  { a: "E", b: "F", costo: 19 },
];

const bid = (s: Suiche) => `${s.prioridad}.${s.mac}`;
const menor = (a: Suiche, b: Suiche) =>
  a.prioridad !== b.prioridad ? a.prioridad < b.prioridad : a.mac < b.mac;

const clave = (c: Cable) => `${c.a}-${c.b}`;

export type EscenarioSpanning = "prioridad" | "sinprioridad" | "caida";

export function correrSpanning(escenario: string): PasoEscena[] {
  // La única diferencia entre el primer escenario y el segundo es esta línea:
  // alguien se tomó el trabajo de bajarle la prioridad al switch del centro.
  const suiches = SUICHES.map((s) =>
    escenario === "sinprioridad" ? { ...s, prioridad: 32768 } : { ...s },
  );
  const caido = escenario === "caida" ? "B-E" : null;
  const cables = CABLES.filter((c) => clave(c) !== caido);

  const de = new Map(suiches.map((s) => [s.id, s]));
  const traer = (id: string) => de.get(id)!;
  const vecinos = (id: string) =>
    cables
      .filter((c) => c.a === id || c.b === id)
      .map((c) => ({ cable: c, otro: c.a === id ? c.b : c.a }));

  const pasos: PasoEscena[] = [];

  // ── Estado que se va llenando y que el dibujo lee en cada paso ──────────
  const costo = new Map<string, number>();
  const rootPort = new Map<string, string>(); // switch → cable que lo lleva a la raíz
  const bloqueado = new Map<string, string>(); // cable → switch que apaga su puerto
  let raiz: Suiche | null = null;

  const nodos = (activo?: string): NodoGrafo[] =>
    suiches.map((s) => {
      const c = costo.get(s.id);
      return {
        id: s.id,
        x: s.x,
        y: s.y,
        nombre: `SW-${s.id}`,
        etiqueta:
          raiz === null
            ? bid(s)
            : s.id === raiz.id
              ? { es: "raíz · 0", en: "root · 0" }
              : c === undefined
                ? "?"
                : { es: `costo ${c}`, en: `cost ${c}` },
        estado:
          s.id === activo
            ? "activo"
            : raiz && s.id === raiz.id
              ? "destacado"
              : c !== undefined
                ? "cerrado"
                : "normal",
      };
    });

  const aristas = (mirando?: string): AristaGrafo[] => {
    const vivas: AristaGrafo[] = cables.map((c) => {
      const k = clave(c);
      const enArbol = rootPort.get(c.a) === k || rootPort.get(c.b) === k;
      const apaga = bloqueado.get(k);
      return {
        a: c.a,
        b: c.b,
        peso: apaga
          ? { es: `bloqueado en ${apaga}`, en: `blocked at ${apaga}` }
          : String(c.costo),
        curva: c.curva,
        estado:
          k === mirando ? "mirando" : apaga ? "apagada" : enArbol ? "arbol" : "normal",
      };
    });

    // El cable caído se sigue dibujando: la gracia del escenario es ver por
    // dónde entra ahora el switch que dependía de él.
    if (caido) {
      const c = CABLES.find((x) => clave(x) === caido)!;
      vivas.push({
        a: c.a,
        b: c.b,
        peso: { es: "cortado", en: "cut" },
        estado: "tenue",
      });
    }
    return vivas;
  };

  const escena = (activo?: string, mirando?: string): EscenaGrafo => ({
    tipo: "grafo",
    nodos: nodos(activo),
    aristas: aristas(mirando),
  });

  const panel = (): ItemPanel[] =>
    suiches
      .map((s) => {
        const c = costo.get(s.id);
        const puerto = rootPort.get(s.id);
        const apagados = [...bloqueado.entries()]
          .filter(([, quien]) => quien === s.id)
          .map(([k]) => k)
          .join(", ");
        return {
          clave: `SW-${s.id}`,
          texto:
            raiz && s.id === raiz.id
              ? { es: "raíz", en: "root" }
              : c === undefined
                ? "—"
                : { es: `costo ${c}`, en: `cost ${c}` },
          nota: puerto
            ? {
                es: `root port ${puerto}${apagados ? ` · apaga ${apagados}` : ""}`,
                en: `root port ${puerto}${apagados ? ` · blocks ${apagados}` : ""}`,
              }
            : raiz && s.id === raiz.id
              ? { es: "todos sus puertos designados", en: "all its ports designated" }
              : undefined,
          destacado: Boolean(raiz && s.id === raiz.id),
        };
      })
      .sort((a, b) => (a.destacado === b.destacado ? 0 : a.destacado ? -1 : 1));

  const paso = (linea: number, texto: Frase, activo?: string, mirando?: string) => {
    pasos.push({ linea, texto, escena: escena(activo, mirando), panel: panel() });
  };

  // ── 1. Todos se creen la raíz ──────────────────────────────────────────
  paso(2, {
    es: `Al encender, cada switch se cree la raíz y lo anuncia por todos sus puertos. Lo único que compara es el <b>bridge ID</b>: prioridad, y si empata, la MAC.`,
    en: `On power-up every switch believes it is the root and announces it on every port. The only thing it compares is the <b>bridge ID</b>: priority first, and the MAC address to break a tie.`,
  });

  // ── 2. Elección ────────────────────────────────────────────────────────
  raiz = suiches.reduce((mejor, s) => (menor(s, mejor) ? s : mejor));
  costo.set(raiz.id, 0);

  paso(
    3,
    escenario === "sinprioridad"
      ? {
          es: `Gana <b>SW-${raiz.id}</b>, con <code>${bid(raiz)}</code>. Nadie lo eligió: como todos tienen la prioridad de fábrica, el desempate lo ganó la MAC más baja — y la MAC más baja suele ser la del switch <b>más viejo del armario</b>, que casi nunca es donde uno querría el centro de la red.`,
          en: `<b>SW-${raiz.id}</b> wins, with <code>${bid(raiz)}</code>. Nobody picked it: since every switch carries the factory priority, the tie went to the lowest MAC — and the lowest MAC is usually the <b>oldest switch in the closet</b>, which is almost never where you would want the centre of the network.`,
        }
      : {
          es: `Gana <b>SW-${raiz.id}</b> con <code>${bid(raiz)}</code>: alguien le bajó la prioridad a 4096 a propósito. Es la única forma de decidir dónde queda el centro de la red en vez de que lo decida una MAC de fábrica.`,
          en: `<b>SW-${raiz.id}</b> wins with <code>${bid(raiz)}</code>: someone lowered its priority to 4096 on purpose. That is the only way to decide where the centre of the network sits, instead of letting a factory MAC decide it.`,
        },
    raiz.id,
  );

  // ── 3. Costo hasta la raíz, en orden de cercanía (Dijkstra) ────────────
  paso(6, {
    es: `Ahora cada switch necesita saber qué le cuesta llegar hasta <b>SW-${raiz.id}</b>. Los BPDU van propagando ese número, sumando el costo de cada enlace que atraviesan.`,
    en: `Now every switch needs to know what it costs to reach <b>SW-${raiz.id}</b>. The BPDUs carry that number outwards, adding the cost of each link they cross.`,
  });

  const pendientes = new Set(suiches.map((s) => s.id));
  pendientes.delete(raiz.id);

  while (pendientes.size) {
    let elegido: string | null = null;
    let mejorCosto = Infinity;
    let mejorCable: Cable | null = null;

    for (const id of pendientes) {
      for (const { cable, otro } of vecinos(id)) {
        const base = costo.get(otro);
        if (base === undefined) continue;
        const cand = base + cable.costo;
        const desempata =
          cand < mejorCosto ||
          (cand === mejorCosto && elegido !== null && menor(traer(id), traer(elegido)));
        if (desempata) {
          elegido = id;
          mejorCosto = cand;
          mejorCable = cable;
        }
      }
    }

    if (elegido === null || mejorCable === null) break; // red partida
    pendientes.delete(elegido);
    costo.set(elegido, mejorCosto);

    // Root port: entre todos sus cables, el que deja la raíz más barata.
    // El desempate real no es «el primero que miré» sino el bridge ID del
    // vecino, y por eso dos switches idénticos siempre eligen lo mismo.
    let puerto = mejorCable;
    let vecinoElegido = mejorCable.a === elegido ? mejorCable.b : mejorCable.a;
    let empates = 0;
    for (const { cable, otro } of vecinos(elegido)) {
      const base = costo.get(otro);
      if (base === undefined || base + cable.costo !== mejorCosto) continue;
      empates++;
      if (menor(traer(otro), traer(vecinoElegido))) {
        puerto = cable;
        vecinoElegido = otro;
      }
    }
    rootPort.set(elegido, clave(puerto));

    paso(
      11,
      empates > 1
        ? {
            es: `<b>SW-${elegido}</b> llega a la raíz por <code>${mejorCosto}</code> de ${empates} maneras distintas, todas iguales de baratas. Desempata el bridge ID del vecino: gana <b>SW-${vecinoElegido}</b> (<code>${bid(traer(vecinoElegido))}</code>), y ese puerto queda como <b>root port</b>.`,
            en: `<b>SW-${elegido}</b> reaches the root at <code>${mejorCosto}</code> in ${empates} different ways, all equally cheap. The neighbour's bridge ID breaks the tie: <b>SW-${vecinoElegido}</b> wins (<code>${bid(traer(vecinoElegido))}</code>), and that port becomes the <b>root port</b>.`,
          }
        : {
            es: `<b>SW-${elegido}</b> llega a la raíz por <code>${mejorCosto}</code> pasando por <b>SW-${vecinoElegido}</b>. Ese puerto es su <b>root port</b>: el único por el que va a mandar todo lo que sube.`,
            en: `<b>SW-${elegido}</b> reaches the root at <code>${mejorCosto}</code> by way of <b>SW-${vecinoElegido}</b>. That port is its <b>root port</b>: the only one it will send upstream traffic through.`,
          },
      elegido,
      clave(puerto),
    );
  }

  // ── 4. Designados y bloqueos ───────────────────────────────────────────
  const sobrantes = cables.filter((c) => {
    const k = clave(c);
    return rootPort.get(c.a) !== k && rootPort.get(c.b) !== k;
  });

  paso(14, {
    es: `Los ${cables.length - sobrantes.length} cables de los root ports ya forman un árbol. Quedan <b>${sobrantes.length}</b> que sobran, y cada uno de ellos cierra un bucle: por ahí una trama de broadcast podría volver al lugar de donde salió.`,
    en: `The ${cables.length - sobrantes.length} root-port cables already form a tree. That leaves <b>${sobrantes.length}</b> spare ones, and every one of them closes a loop: a broadcast frame could come back through there to where it started.`,
  });

  for (const c of sobrantes) {
    const ca = costo.get(c.a) ?? Infinity;
    const cb = costo.get(c.b) ?? Infinity;
    const gana =
      ca !== cb ? (ca < cb ? c.a : c.b) : menor(traer(c.a), traer(c.b)) ? c.a : c.b;
    const pierde = gana === c.a ? c.b : c.a;

    paso(
      17,
      ca !== cb
        ? {
            es: `En el cable <b>${clave(c)}</b> tiene que quedar un solo responsable. <b>SW-${gana}</b> está a <code>${Math.min(ca, cb)}</code> de la raíz y <b>SW-${pierde}</b> a <code>${Math.max(ca, cb)}</code>: manda el que está más cerca.`,
            en: `Cable <b>${clave(c)}</b> can only have one switch in charge. <b>SW-${gana}</b> sits <code>${Math.min(ca, cb)}</code> from the root and <b>SW-${pierde}</b> sits <code>${Math.max(ca, cb)}</code> away: the closer one takes it.`,
          }
        : {
            es: `En el cable <b>${clave(c)}</b> los dos están a <code>${ca}</code> de la raíz. Empate perfecto, así que decide el bridge ID: <b>SW-${gana}</b> (<code>${bid(traer(gana))}</code>) es el designado.`,
            en: `On cable <b>${clave(c)}</b> both switches sit <code>${ca}</code> from the root. A perfect tie, so the bridge ID decides: <b>SW-${gana}</b> (<code>${bid(traer(gana))}</code>) is the designated one.`,
          },
      undefined,
      clave(c),
    );

    bloqueado.set(clave(c), pierde);

    paso(
      18,
      {
        es: `<b>SW-${pierde}</b> apaga su punta de <b>${clave(c)}</b>. El cable sigue enchufado y el enlace sigue arriba — simplemente deja de reenviar tramas. <em>Esa capacidad apagada es el precio de que la red no se caiga.</em>`,
        en: `<b>SW-${pierde}</b> shuts down its end of <b>${clave(c)}</b>. The cable stays plugged in and the link stays up — it simply stops forwarding frames. <em>That idle capacity is the price of the network staying alive.</em>`,
      },
      pierde,
      clave(c),
    );
  }

  // ── 5. Cierre ──────────────────────────────────────────────────────────
  const bloqueados = bloqueado.size;
  const enArbol = cables.length - bloqueados;

  pasos.push({
    linea: 0,
    texto: {
      es: `Listo: un solo camino entre cualquier par de switches, y ni un bucle.`,
      en: `Done: exactly one path between any two switches, and not a single loop.`,
    },
    escena: escena(),
    panel: panel(),
    veredicto:
      escenario === "caida"
        ? {
            es: `Se cortó el enlace <b>B–E</b> y la red se rearmó sola: <b>SW-E</b> entró por <b>E–F</b>, que era uno de los puertos que estaban apagados. <em>Para eso existían: no eran cable desperdiciado, era el plan B.</em> ${enArbol} enlaces activos y ${bloqueados} bloqueados sobre ${cables.length}.`,
            en: `Link <b>B–E</b> was cut and the network rebuilt itself: <b>SW-E</b> came back in through <b>E–F</b>, one of the ports that had been shut down. <em>That is what they were for: not wasted cable, but the plan B.</em> ${enArbol} links active and ${bloqueados} blocked out of ${cables.length}.`,
          }
        : escenario === "sinprioridad"
          ? {
              es: `La raíz quedó en <b>SW-${raiz.id}</b>, en el borde de la red, solo porque tenía la MAC más baja. El árbol funciona igual —no hay bucles— pero ahora hasta el tráfico entre dos switches vecinos puede terminar cruzando la red entera. <em>Por eso la prioridad de la raíz se configura: si no, la elige el azar de fábrica.</em>`,
              en: `The root landed on <b>SW-${raiz.id}</b>, out at the edge of the network, purely because it had the lowest MAC. The tree still works —there are no loops— but now even traffic between two neighbouring switches can end up crossing the whole network. <em>That is why the root priority gets configured: otherwise a factory accident picks it.</em>`,
            }
          : {
              es: `${cables.length} enlaces, <b>${enArbol}</b> activos y <b>${bloqueados}</b> bloqueados. Un árbol de ${suiches.length} nodos tiene ${suiches.length - 1} aristas, así que la cuenta cierra sola. <em>Probá «Se cae un enlace» para ver de qué sirven los puertos apagados.</em>`,
              en: `${cables.length} links, <b>${enArbol}</b> active and <b>${bloqueados}</b> blocked. A tree of ${suiches.length} nodes has ${suiches.length - 1} edges, so the arithmetic works out on its own. <em>Try «A link goes down» to see what the blocked ports are good for.</em>`,
            },
  });

  return pasos;
}
