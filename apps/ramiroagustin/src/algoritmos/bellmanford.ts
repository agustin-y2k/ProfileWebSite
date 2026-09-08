import type { Frase } from "../i18n/idioma";
import type {
  AristaGrafo,
  EscenaGrafo,
  ItemPanel,
  NodoGrafo,
  PasoEscena,
} from "./escena";

/**
 * Bellman-Ford, en la forma en que se lo encuentra en una red de verdad: RIP.
 *
 * Dijkstra necesita que alguien conozca el mapa entero. Bellman-Ford no: cada
 * router solo habla con sus vecinos y solo sabe lo que ellos le cuentan. Esa
 * es su gracia —y también su desgracia, porque nadie verifica nada—. Cuando un
 * enlace se cae, los routers se creen entre ellos rutas que ya no existen y se
 * pasan el error de a un salto por vez: la «cuenta hasta infinito».
 *
 * Los tres escenarios son el mismo algoritmo. Lo único que cambia es qué pasó
 * en la red y si alguien se acordó de activar split horizon.
 */

const INALCANZABLE = 16; // En RIP, 16 saltos significa «no llego». No es un bug: es el techo.

const ROUTERS = ["R1", "R2", "R3", "R4", "R5"] as const;
const X = [9, 25, 41, 57, 73];

type Tabla = Map<string, { dist: number; via: string | null }>;

const copiar = (t: Tabla): Tabla => new Map([...t].map(([k, v]) => [k, { ...v }]));

const vecinosDe = (r: string, cortado: boolean) => {
  const i = ROUTERS.indexOf(r as (typeof ROUTERS)[number]);
  const lista: string[] = [];
  if (i > 0) lista.push(ROUTERS[i - 1]!);
  if (i < ROUTERS.length - 1 && !(cortado && r === "R4")) lista.push(ROUTERS[i + 1]!);
  if (cortado && r === "R5") return lista.filter((v) => v !== "R4");
  return lista;
};

export function correrBellmanFord(escenario: string): PasoEscena[] {
  const cortado = escenario !== "converge";
  const split = escenario === "splithorizon";

  const tabla: Tabla = new Map(
    ROUTERS.map((r) => [
      r,
      escenario === "converge"
        ? { dist: r === "R5" ? 0 : INALCANZABLE, via: r === "R5" ? "LAN" : null }
        : {
            dist: ROUTERS.length - 1 - ROUTERS.indexOf(r),
            via: r === "R5" ? "LAN" : ROUTERS[ROUTERS.indexOf(r) + 1]!,
          },
    ]),
  );

  const pasos: PasoEscena[] = [];

  const escena = (activo?: string, ronda?: number): EscenaGrafo => {
    const nodos: NodoGrafo[] = ROUTERS.map((r, i) => {
      const e = tabla.get(r)!;
      return {
        id: r,
        x: X[i]!,
        y: 42,
        nombre: r,
        etiqueta:
          e.dist >= INALCANZABLE
            ? "∞"
            : e.via === "LAN"
              ? { es: "conectada", en: "connected" }
              : { es: `${e.dist} vía ${e.via}`, en: `${e.dist} via ${e.via}` },
        estado:
          r === activo
            ? ("activo" as const)
            : e.dist >= INALCANZABLE
              ? ("descartado" as const)
              : e.dist >= 8
                ? ("pendiente" as const)
                : ("cerrado" as const),
      };
    });

    nodos.push({
      id: "LAN",
      x: 91,
      y: 42,
      nombre: "LAN",
      etiqueta: "10.0.5.0/24",
      estado:
        cortado && (ronda ?? 0) > 0 ? ("descartado" as const) : ("destacado" as const),
    });

    const aristas: AristaGrafo[] = [];
    for (let i = 0; i < ROUTERS.length - 1; i++) {
      const roto = cortado && i === 3;
      aristas.push({
        a: ROUTERS[i]!,
        b: ROUTERS[i + 1]!,
        peso: roto ? { es: "cortado", en: "cut" } : "1",
        estado: roto ? "tenue" : "normal",
      });
    }
    aristas.push({ a: "R5", b: "LAN", peso: "0", estado: cortado ? "tenue" : "arbol" });

    return { tipo: "grafo", nodos, aristas };
  };

  const panel = (): ItemPanel[] =>
    ROUTERS.map((r) => {
      const e = tabla.get(r)!;
      return {
        clave: r,
        texto:
          e.dist >= INALCANZABLE
            ? { es: "métrica 16 = ∞", en: "metric 16 = ∞" }
            : { es: `métrica ${e.dist}`, en: `metric ${e.dist}` },
        nota:
          e.via === null
            ? { es: "sin ruta", en: "no route" }
            : e.via === "LAN"
              ? { es: "conectada", en: "connected" }
              : `next hop ${e.via}`,
        destacado: e.dist < INALCANZABLE && e.via !== null,
      };
    });

  const paso = (linea: number, txt: Frase, activo?: string, ronda?: number) =>
    pasos.push({ linea, texto: txt, escena: escena(activo, ronda), panel: panel() });

  // ── Arranque ───────────────────────────────────────────────────────────
  if (!cortado) {
    paso(
      3,
      {
        es: `Cinco routers en fila. Solo <b>R5</b> sabe algo: la red <code>10.0.5.0/24</code> está enchufada a él, así que le pone métrica <code>0</code>. Los otros cuatro no tienen la menor idea de que esa red existe.`,
        en: `Five routers in a row. Only <b>R5</b> knows anything: network <code>10.0.5.0/24</code> is plugged straight into it, so it gives it metric <code>0</code>. The other four have no idea that network even exists.`,
      },
      "R5",
    );
  } else {
    paso(3, {
      es: `La red ya está convergida: cada router sabe a cuántos saltos queda <code>10.0.5.0/24</code> y por quién. <b>Y todo esto es de oídas</b>: R1 nunca vio esa red, solo le cree a R2.`,
      en: `The network has already converged: every router knows how many hops away <code>10.0.5.0/24</code> is and through whom. <b>And all of it is hearsay</b>: R1 has never seen that network, it just takes R2's word for it.`,
    });
    tabla.set("R4", { dist: INALCANZABLE, via: null });
    paso(
      15,
      {
        es: `Se corta el enlace <b>R4–R5</b>. R4 lo nota al instante —es su propio cable— y marca la ruta con métrica <b>16</b>: para RIP, inalcanzable. ${
          split
            ? "Con <b>split horizon</b> activo, cada router deja de anunciar una ruta hacia el vecino del que la aprendió."
            : "Nadie más se enteró todavía, y ese es todo el problema."
        }`,
        en: `Link <b>R4–R5</b> goes down. R4 notices instantly —it is its own cable— and marks the route with metric <b>16</b>: unreachable, as far as RIP is concerned. ${
          split
            ? "With <b>split horizon</b> on, no router advertises a route back to the neighbour it learned it from."
            : "Nobody else has heard yet, and that is the whole problem."
        }`,
      },
      "R4",
    );
  }

  // ── Rondas ─────────────────────────────────────────────────────────────
  let ronda = 0;
  let ultimoCambio = 0;
  const MAX = 40;

  while (ronda < MAX) {
    ronda++;
    const previa = copiar(tabla);

    // Quién le anuncia qué a quién. Split horizon es exactamente una línea:
    // no le devuelvo una ruta al vecino que me la enseñó.
    const anuncio = (emisor: string, receptor: string): number | null => {
      const e = previa.get(emisor)!;
      if (split && e.via === receptor) return null;
      return e.dist;
    };

    paso(
      7,
      {
        es: `<b>Ronda ${ronda}.</b> Cada router le manda a sus vecinos la única cosa que sabe: «yo llego a esa red en tantos saltos». No manda el camino, ni por dónde va. Solo el número.`,
        en: `<b>Round ${ronda}.</b> Every router sends its neighbours the one thing it knows: «I reach that network in this many hops». It does not send the path, nor which way it goes. Just the number.`,
      },
      undefined,
      ronda,
    );

    let cambio = false;
    for (const r of ROUTERS) {
      const actual = previa.get(r)!;
      if (actual.via === "LAN") continue; // R5 no aprende nada: la red es suya

      let mejor = INALCANZABLE;
      let via: string | null = null;
      for (const v of vecinosDe(r, cortado)) {
        const promesa = anuncio(v, r);
        if (promesa === null) continue;
        const cand = Math.min(promesa + 1, INALCANZABLE);
        if (cand < mejor) {
          mejor = cand;
          via = cand >= INALCANZABLE ? null : v;
        }
      }

      const antes = tabla.get(r)!;
      if (antes.dist !== mejor || antes.via !== via) cambio = true;
      tabla.set(r, { dist: mejor, via });
    }

    const bajando = [...tabla.values()].filter((e) => e.dist < INALCANZABLE).length;

    paso(
      12,
      cortado
        ? split
          ? {
              es: `Cada uno se queda con la mejor promesa que le hicieron. Como nadie le devuelve a su propio next hop una ruta que aprendió de él, <b>el ∞ se propaga limpio</b>: quedan ${bajando} routers creyendo todavía que llegan.`,
              en: `Each one keeps the best promise it was made. Since nobody hands a route back to the very next hop it learned it from, <b>the ∞ propagates cleanly</b>: ${bajando} routers still believe they can get there.`,
            }
          : {
              es: `Cada uno se queda con la mejor promesa. Acá está la trampa: <b>R3 le cree a R2</b>, que sigue anunciando su métrica vieja — y esa ruta pasaba por R3. Se están pasando entre ellos un camino que ya no existe, un salto más caro cada vez.`,
              en: `Each one keeps the best promise. Here is the trap: <b>R3 believes R2</b>, which is still advertising its old metric — and that route went through R3. They are handing each other a path that no longer exists, one hop more expensive every time.`,
            }
        : {
            es: `Cada uno se queda con la mejor promesa y le suma <code>1</code>, el costo de su propio enlace. La información avanza <b>exactamente un salto por ronda</b>: por eso hacen falta hasta V−1 rondas para que la red entera se entere.`,
            en: `Each one keeps the best promise and adds <code>1</code>, the cost of its own link. The news travels <b>exactly one hop per round</b>: that is why it can take V−1 rounds for the whole network to find out.`,
          },
      undefined,
      ronda,
    );

    if (!cambio) break;
    ultimoCambio = ronda;
  }

  // ── Cierre ─────────────────────────────────────────────────────────────
  const pico = Math.max(
    ...ROUTERS.filter((r) => r !== "R5").map((r) => tabla.get(r)!.dist),
  );

  pasos.push({
    linea: 0,
    texto: cortado
      ? {
          es: `Se terminó: la métrica llegó al techo y todos aceptaron que la red no está.`,
          en: `Over: the metric hit the ceiling and everyone accepted the network is gone.`,
        }
      : {
          es: `Convergido: los cinco saben llegar.`,
          en: `Converged: all five know how to get there.`,
        },
    escena: escena(undefined, ronda),
    panel: panel(),
    veredicto: !cortado
      ? {
          es: `<b>${ultimoCambio}</b> rondas para que la noticia cruzara ${ROUTERS.length} routers, una por salto. Eso es Bellman-Ford: relajar todas las aristas V−1 veces, salvo que acá cada arista la relaja un equipo distinto que no conoce el mapa. <em>Ahora cortá el enlace y mirá qué pasa cuando la noticia es mala.</em>`,
          en: `<b>${ultimoCambio}</b> rounds for the news to cross ${ROUTERS.length} routers, one per hop. That is Bellman-Ford: relax every edge V−1 times, except that here each edge is relaxed by a different box that has never seen the map. <em>Now cut the link and watch what happens when the news is bad.</em>`,
        }
      : split
        ? {
            es: `<b>${ultimoCambio}</b> rondas y listo, sin ninguna métrica inventada. Split horizon es una sola regla —«no le devuelvo una ruta al que me la enseñó»— y elimina la cuenta hasta infinito de este caso. <em>No la elimina en general: con tres routers en triángulo, el problema vuelve.</em> Por eso el techo de 16 sigue existiendo.`,
            en: `<b>${ultimoCambio}</b> rounds and done, without a single invented metric. Split horizon is one rule —«I do not hand a route back to whoever taught it to me»— and it kills the count to infinity in this case. <em>It does not kill it in general: put three routers in a triangle and the problem is back.</em> That is why the ceiling of 16 still exists.`,
          }
        : {
            es: `Hicieron falta <b>${ultimoCambio}</b> rondas —más de ${Math.round((ultimoCambio * 30) / 60)} minutos con el temporizador de 30 segundos de RIP— para que los cuatro aceptaran que la red no existe. La métrica no saltó a ∞: <b>trepó de a un salto</b> hasta chocar contra el techo de ${pico}. <em>Eso es la cuenta hasta infinito, y es la razón por la que 16 es infinito en RIP: sin ese techo, la cuenta no terminaría nunca.</em>`,
            en: `It took <b>${ultimoCambio}</b> rounds —more than ${Math.round((ultimoCambio * 30) / 60)} minutes with RIP's 30-second timer— for the four of them to accept that the network is gone. The metric did not jump to ∞: it <b>climbed one hop at a time</b> until it hit the ceiling of ${pico}. <em>That is the count to infinity, and it is why 16 means infinity in RIP: without that ceiling, the count would never end.</em>`,
          },
  });

  return pasos;
}
