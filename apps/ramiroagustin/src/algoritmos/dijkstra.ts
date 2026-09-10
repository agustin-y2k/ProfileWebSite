import type { Frase } from "../i18n/idioma";
import type {
  AristaGrafo,
  EscenaGrafo,
  ItemPanel,
  NodoGrafo,
  PasoEscena,
} from "./escena";

/**
 * Dijkstra en la forma en que corre en una red de verdad: el cálculo SPF de
 * OSPF.
 *
 * Un router no le pregunta a nadie por dónde ir. Recibe los LSA de toda el
 * área, arma con ellos el LSDB —el mapa completo, idéntico en todos— y corre
 * este algoritmo sobre su propia copia. Lo que sale no es «un camino»: es la
 * tabla de ruteo entera, un renglón por destino. Por eso el algoritmo no se
 * detiene cuando encuentra al primero: no hay un destino, hay todos.
 *
 * Las dos listas tienen nombre propio en el estándar y acá se usan esos: TENT
 * son los candidatos con un costo provisorio y PATH los que ya quedaron
 * sellados.
 *
 * Los tres escenarios son el mismo algoritmo sobre distinto LSDB. En los dos
 * últimos SPF no se equivoca en ningún paso y la red igual anda mal: una vez
 * porque la métrica miente y otra porque el mapa está viejo.
 */

const YO = "R1";

const POSICION: Record<string, { x: number; y: number }> = {
  R1: { x: 10, y: 50 },
  R2: { x: 34, y: 17 },
  R3: { x: 34, y: 83 },
  R4: { x: 64, y: 17 },
  R5: { x: 64, y: 83 },
  R6: { x: 89, y: 50 },
};

const ROUTERS = ["R1", "R2", "R3", "R4", "R5", "R6"] as const;

type Enlace = {
  a: string;
  b: string;
  costo: number;
  /** Lo que va escrito sobre el cable. Con ancho de banda, cuando importa. */
  rotulo: Frase;
  /** Está en el LSDB pero el cable ya no existe. Solo el escenario viejo. */
  fantasma?: boolean;
};

/**
 * La topología de cada escenario.
 *
 * «anchodebanda» es la misma red cableada de nuevo y con un enlace directo
 * R3–R6, porque la moraleja necesita que el camino lento tenga menos saltos
 * que el rápido: si los dos tienen tres, empatan y no se ve nada.
 */
function topologia(escenario: string): Enlace[] {
  if (escenario === "anchodebanda") {
    // Ancho de banda y costo, en ese orden. Escribir «costo» en cada cable
    // no entra: son nueve enlaces y las etiquetas se pisan entre sí.
    const bw = (giga: boolean | "cien") =>
      giga === "cien" ? "100M·1" : giga ? "10G·1" : "1G·1";

    return [
      { a: "R1", b: "R2", costo: 1, rotulo: bw(true) },
      { a: "R1", b: "R3", costo: 1, rotulo: bw("cien") },
      { a: "R2", b: "R3", costo: 1, rotulo: bw(false) },
      { a: "R2", b: "R4", costo: 1, rotulo: bw(true) },
      { a: "R3", b: "R5", costo: 1, rotulo: bw("cien") },
      { a: "R3", b: "R6", costo: 1, rotulo: bw("cien") },
      { a: "R4", b: "R5", costo: 1, rotulo: bw(false) },
      { a: "R4", b: "R6", costo: 1, rotulo: bw(true) },
      { a: "R5", b: "R6", costo: 1, rotulo: bw("cien") },
    ];
  }

  const viejo = escenario === "desincronizado";

  return [
    { a: "R1", b: "R2", costo: 1, rotulo: "1" },
    { a: "R1", b: "R3", costo: 2, rotulo: "2" },
    { a: "R2", b: "R3", costo: 4, rotulo: "4" },
    { a: "R2", b: "R4", costo: 4, rotulo: "4" },
    {
      a: "R3",
      b: "R5",
      costo: 1,
      rotulo: viejo ? { es: "1 · caído", en: "1 · down" } : "1",
      fantasma: viejo,
    },
    { a: "R4", b: "R5", costo: 3, rotulo: "3" },
    { a: "R4", b: "R6", costo: 2, rotulo: "2" },
    { a: "R5", b: "R6", costo: 6, rotulo: "6" },
  ];
}

const vecinosDe = (enlaces: Enlace[], r: string) =>
  enlaces
    .filter((e) => e.a === r || e.b === r)
    .map((e) => ({ id: e.a === r ? e.b : e.a, costo: e.costo }));

export function correrDijkstra(escenario: string): PasoEscena[] {
  const enlaces = topologia(escenario);
  const pasos: PasoEscena[] = [];

  const costo = new Map<string, number>([[YO, 0]]);
  const salida = new Map<string, string>(); // destino → primer salto
  const padre = new Map<string, string>();
  const path = new Set<string>();
  const tent: [string, number][] = [[YO, 0]];

  /** Los candidatos vivos, del más barato al más caro. */
  const enTent = () => {
    const mejor = new Map<string, number>();
    for (const [id, c] of tent) {
      if (path.has(id)) continue;
      if (c < (mejor.get(id) ?? Infinity)) mejor.set(id, c);
    }
    return [...mejor].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  };

  const escena = (
    activo?: string,
    mirando?: { a: string; b: string },
    bucle?: boolean,
  ): EscenaGrafo => {
    const pendientes = new Map(enTent());

    const nodos: NodoGrafo[] = ROUTERS.map((r) => ({
      id: r,
      ...POSICION[r]!,
      nombre: r,
      // El «por X» solo se escribe cuando dice algo: en un vecino directo de
      // R1 la interfaz de salida es el propio vecino, y repetirlo le pisa el
      // peso al enlace que tiene al lado.
      etiqueta:
        r === YO
          ? { es: "yo", en: "me" } // el 0 se sobreentiende, y la etiqueta larga
          : // se pisaba con el peso del enlace vecino en pantallas angostas
            !costo.has(r)
            ? "∞"
            : !path.has(r)
              ? `${costo.get(r)}`
              : salida.get(r) === r
                ? `${costo.get(r)}`
                : {
                    es: `${costo.get(r)} por ${salida.get(r)}`,
                    en: `${costo.get(r)} via ${salida.get(r)}`,
                  },
      estado:
        r === activo
          ? ("activo" as const)
          : r === YO
            ? ("destacado" as const)
            : path.has(r)
              ? ("cerrado" as const)
              : pendientes.has(r)
                ? ("pendiente" as const)
                : ("normal" as const),
    }));

    const aristas: AristaGrafo[] = enlaces.map((e) => {
      const enArbol =
        (padre.get(e.a) === e.b && path.has(e.a)) ||
        (padre.get(e.b) === e.a && path.has(e.b));
      const seMira =
        mirando !== undefined &&
        ((mirando.a === e.a && mirando.b === e.b) ||
          (mirando.a === e.b && mirando.b === e.a));

      return {
        a: e.a,
        b: e.b,
        peso: e.rotulo,
        estado: e.fantasma
          ? ("tenue" as const)
          : seMira
            ? ("mirando" as const)
            : enArbol
              ? ("arbol" as const)
              : ("normal" as const),
      };
    });

    // El bucle de ruteo no es un enlace: son dos decisiones que se contradicen,
    // así que se dibujan como lo que son, dos flechas encontradas.
    if (bucle) {
      aristas.push(
        { a: "R1", b: "R3", curva: 10, flecha: true, estado: "mirando" },
        { a: "R3", b: "R1", curva: 10, flecha: true, estado: "mirando" },
      );
    }

    return { tipo: "grafo", nodos, aristas };
  };

  const panel = (): ItemPanel[] => {
    const pendientes = enTent();
    const primero = pendientes[0]?.[0];

    const filas: ItemPanel[] = [];

    for (const [id, c] of pendientes) {
      filas.push({
        clave: id,
        texto: { es: `TENT · costo ${c}`, en: `TENT · cost ${c}` },
        nota:
          salida.get(id) === undefined
            ? { es: "provisorio", en: "tentative" }
            : {
                es: `provisorio, por ${salida.get(id)}`,
                en: `tentative, via ${salida.get(id)}`,
              },
        destacado: id === primero,
      });
    }

    for (const r of ROUTERS) {
      if (!path.has(r) || r === YO) continue;
      filas.push({
        clave: r,
        texto: { es: `PATH · costo ${costo.get(r)}`, en: `PATH · cost ${costo.get(r)}` },
        nota: { es: `sale por ${salida.get(r)}`, en: `exits via ${salida.get(r)}` },
      });
    }

    return filas;
  };

  const paso = (
    linea: number,
    texto: Frase,
    activo?: string,
    mirando?: { a: string; b: string },
  ) => pasos.push({ linea, texto, escena: escena(activo, mirando), panel: panel() });

  // ── Arranque ───────────────────────────────────────────────────────────
  paso(
    4,
    escenario === "anchodebanda"
      ? {
          es: `<b>R1</b> tiene el LSDB completo y arranca por sí mismo, con costo <code>0</code>. En cada cable está escrito su ancho de banda y, después del punto, el costo OSPF que le tocó. <em>Fijate en los costos antes de seguir: son todos <code>1</code>.</em>`,
          en: `<b>R1</b> holds the complete LSDB and starts from itself, at cost <code>0</code>. Each cable is labelled with its bandwidth and, after the dot, the OSPF cost it was given. <em>Look at the costs before going on: every one of them is <code>1</code>.</em>`,
        }
      : escenario === "desincronizado"
        ? {
            es: `<b>R1</b> tiene su LSDB y va a calcular sobre él. Lo que no sabe es que el enlace <b>R3–R5</b> se cayó hace unos segundos y el LSA con la novedad todavía no le llegó. <em>Para R1 ese cable existe</em>, y va a calcular como si existiera.`,
            en: `<b>R1</b> has its LSDB and is about to compute over it. What it does not know is that link <b>R3–R5</b> went down seconds ago and the LSA carrying the news has not reached it yet. <em>As far as R1 is concerned that cable is there</em>, and it will compute as if it were.`,
          }
        : {
            es: `<b>R1</b> ya tiene el LSDB completo: los seis routers del área inundaron sus LSA y todos tienen el mismo mapa. Ahora R1 no le pregunta nada a nadie —calcula solo, sobre su copia— y empieza por lo único que sabe seguro: <b>a sí mismo le cuesta 0</b>.`,
            en: `<b>R1</b> already holds the complete LSDB: all six routers in the area flooded their LSAs and every one of them has the same map. Now R1 asks nobody anything —it computes alone, over its own copy— and starts from the one thing it knows for certain: <b>reaching itself costs 0</b>.`,
          },
    YO,
  );

  // ── El bucle ───────────────────────────────────────────────────────────
  while (tent.length) {
    let mi = 0;
    for (let i = 1; i < tent.length; i++) if (tent[i]![1] < tent[mi]![1]) mi = i;
    const [actual, d] = tent.splice(mi, 1)[0]!;

    if (path.has(actual)) continue;

    path.add(actual);

    if (actual !== YO) {
      paso(
        12,
        {
          es: `Sale de TENT el más barato: <b>${actual}</b>, costo <code>${d}</code>. Pasa a PATH y ahí queda sellado — <b>ningún camino que aparezca después puede mejorarlo</b>, porque cualquier otro tendría que salir de un router que cuesta más. Eso es todo lo que hace correcto al algoritmo.`,
          en: `The cheapest one leaves TENT: <b>${actual}</b>, cost <code>${d}</code>. It moves to PATH and stays sealed there — <b>no path found later can improve it</b>, because any other one would have to leave from a router that costs more. That is the whole of what makes the algorithm correct.`,
        },
        actual,
      );
    }

    for (const v of vecinosDe(enlaces, actual)) {
      if (path.has(v.id)) continue;

      const cand = d + v.costo;
      const hoy = costo.get(v.id);

      paso(
        15,
        {
          es: `Enlace <b>${actual}–${v.id}</b>, costo <code>${v.costo}</code>: llegar a ${v.id} por acá sale <code>${d} + ${v.costo} = ${cand}</code>, y hoy figura <code>${hoy ?? "∞"}</code>.`,
          en: `Link <b>${actual}–${v.id}</b>, cost <code>${v.costo}</code>: reaching ${v.id} this way runs <code>${d} + ${v.costo} = ${cand}</code>, and right now it stands at <code>${hoy ?? "∞"}</code>.`,
        },
        actual,
        { a: actual, b: v.id },
      );

      if (cand < (hoy ?? Infinity)) {
        const primerSalto = actual === YO ? v.id : salida.get(actual)!;
        const anterior = salida.get(v.id);
        const cambiaSalida = anterior !== undefined && anterior !== primerSalto;

        costo.set(v.id, cand);
        salida.set(v.id, primerSalto);
        padre.set(v.id, actual);
        tent.push([v.id, cand]);

        paso(
          18,
          actual === YO
            ? {
                es: `Mejora: <b>${v.id}</b> queda en <code>${cand}</code>. Como el salto sale de R1, la interfaz de salida <b>es el propio ${v.id}</b>: los paquetes para ese destino se van por ese cable.`,
                en: `An improvement: <b>${v.id}</b> now stands at <code>${cand}</code>. Since the hop leaves R1 itself, the exit interface <b>is ${v.id}</b>: packets for that destination go out that cable.`,
              }
            : cambiaSalida
              ? {
                  es: `Mejora: <b>${v.id}</b> baja a <code>${cand}</code>. Y acá pasa lo que importa de verdad: la interfaz de salida se hereda de ${actual}, así que la ruta a ${v.id} <b>se muda de puerto</b> — deja de salir por ${anterior} y pasa a salir por <b>${primerSalto}</b>.`,
                  en: `An improvement: <b>${v.id}</b> drops to <code>${cand}</code>. And here is what actually matters: the exit interface is inherited from ${actual}, so the route to ${v.id} <b>moves to another port</b> — it stops going out through ${anterior} and starts going out through <b>${primerSalto}</b>.`,
                }
              : {
                  es: `Mejora: <b>${v.id}</b> queda en <code>${cand}</code>, y hereda de ${actual} la interfaz de salida — <b>${primerSalto}</b>. Un router no guarda el camino entero: guarda el primer salto y nada más.`,
                  en: `An improvement: <b>${v.id}</b> now stands at <code>${cand}</code>, and inherits ${actual}'s exit interface — <b>${primerSalto}</b>. A router does not store the whole path: it stores the first hop and nothing else.`,
                },
          actual,
          { a: actual, b: v.id },
        );
      } else {
        paso(
          16,
          {
            es: `No mejora: ${v.id} ya figura en <code>${hoy}</code>. El enlace queda sin usar, y no porque esté mal — simplemente hay una forma más barata de llegar.`,
            en: `No improvement: ${v.id} already stands at <code>${hoy}</code>. The link goes unused, and not because there is anything wrong with it — there is simply a cheaper way in.`,
          },
          actual,
          { a: actual, b: v.id },
        );
      }
    }
  }

  // ── Cierre ─────────────────────────────────────────────────────────────
  const tabla = ROUTERS.filter((r) => r !== YO)
    .map((r) => `${r} por ${salida.get(r)} (${costo.get(r)})`)
    .join(", ");

  pasos.push({
    linea: 24,
    texto: {
      es: `TENT quedó vacía y no hubo ningún «llegué»: <b>SPF no busca un destino, los cierra a todos</b>. Los cinco renglones que quedan en PATH son, tal cual, la tabla de ruteo de R1 — ${tabla}.`,
      en: `TENT ran dry and there was no «I arrived» anywhere: <b>SPF does not look for a destination, it settles every one of them</b>. The five rows left in PATH are, exactly as they stand, R1's routing table — ${tabla}.`,
    },
    escena: escena(),
    panel: panel(),
  });

  pasos.push({
    linea: 0,
    texto:
      escenario === "desincronizado"
        ? {
            es: `Y ahora el problema: ese cálculo impecable salió de un mapa viejo.`,
            en: `And now the problem: that flawless calculation came out of a stale map.`,
          }
        : {
            es: `La tabla está lista. Cada paquete que entre a R1 se resuelve mirando un solo renglón.`,
            en: `The table is ready. Every packet arriving at R1 is resolved by reading a single row.`,
          },
    escena: escena(undefined, undefined, escenario === "desincronizado"),
    panel: panel(),
    veredicto: veredicto(escenario, costo, salida),
  });

  return pasos;
}

function veredicto(
  escenario: string,
  costo: Map<string, number>,
  salida: Map<string, string>,
): Frase {
  if (escenario === "anchodebanda") {
    return {
      es: `SPF no se equivocó en ningún paso: <b>R6 por ${salida.get("R6")}, costo ${costo.get("R6")}</b> es el mínimo exacto del grafo que le dieron. El problema es el grafo. El costo OSPF por defecto es <code>10⁸ / ancho de banda</code>, así que <b>todo enlace de 100 Mbps para arriba cuesta 1</b> y la métrica se convierte en cuenta de saltos: los 100 Mbps de R3 ganan por tener un salto menos, y los tres tramos de 10 Gbps quedan sin usar. <em>El algoritmo es óptimo respecto de una métrica que miente, y eso se arregla en la configuración —subiendo el reference-bandwidth—, no en el algoritmo.</em>`,
      en: `SPF did not put a foot wrong: <b>R6 via ${salida.get("R6")}, cost ${costo.get("R6")}</b> is the exact minimum of the graph it was handed. The graph is the problem. Default OSPF cost is <code>10⁸ / bandwidth</code>, so <b>every link of 100 Mbps or better costs 1</b> and the metric collapses into hop count: R3's 100 Mbps wins by being one hop shorter, and three 10 Gbps stretches go unused. <em>The algorithm is optimal with respect to a metric that lies, and that is fixed in the configuration —by raising the reference bandwidth— not in the algorithm.</em>`,
    };
  }

  if (escenario === "desincronizado") {
    return {
      es: `R1 cerró los cinco destinos sin un solo error de cuenta y le quedó <b>R5 por R3, costo ${costo.get("R5")}</b>. Pero R3 sí sabe que el cable a R5 se cortó —es suyo— y ya recalculó: con ese enlace afuera, a R3 le conviene salir por R1. <em>Cada uno corrió Dijkstra perfecto sobre un mapa distinto</em>, así que el paquete para R5 va de R1 a R3, de R3 a R1, y así hasta que el TTL lo mate. <b>Dijkstra no exige que el mapa sea bueno: exige que sea el mismo en todos.</b> Eso no lo garantiza el algoritmo, lo garantiza la inundación de LSA — y mientras dura, la red tiene un bucle.`,
      en: `R1 settled all five destinations without a single slip in arithmetic and ended up with <b>R5 via R3, cost ${costo.get("R5")}</b>. But R3 does know its cable to R5 is cut —it is its own— and has already recomputed: with that link gone, R3's cheapest way out is through R1. <em>Each of them ran a perfect Dijkstra over a different map</em>, so the packet for R5 goes R1 to R3, R3 to R1, and around again until the TTL kills it. <b>Dijkstra does not demand that the map be good: it demands that it be the same one everywhere.</b> The algorithm does not guarantee that, LSA flooding does — and for as long as flooding takes, the network has a loop.`,
    };
  }

  return {
    es: `Cinco destinos, cinco renglones, y ni una sola vez el algoritmo preguntó «¿ya llegué?». <b>Eso es lo que a Dijkstra se le suele contar mal</b>: no encuentra un camino corto, cierra todos los destinos en orden de costo creciente y la tabla de ruteo es el subproducto. Mirá <b>R6</b>: llegó a figurar en <code>9</code> saliendo por R3 y terminó en <code>${costo.get("R6")}</code> saliendo por ${salida.get("R6")}, porque el camino por R4 apareció recién cuando R4 se cerró. <em>Un destino no está resuelto hasta que sale de TENT, por más que ya tenga un número escrito.</em>`,
    en: `Five destinations, five rows, and not once did the algorithm ask «am I there yet?». <b>That is the part people usually get wrong about Dijkstra</b>: it does not find a short path, it settles every destination in order of increasing cost and the routing table falls out as a by-product. Look at <b>R6</b>: it stood at <code>9</code> going out through R3 and ended at <code>${costo.get("R6")}</code> going out through ${salida.get("R6")}, because the path through R4 only showed up once R4 was settled. <em>A destination is not solved until it leaves TENT, however firm the number written next to it looks.</em>`,
  };
}
