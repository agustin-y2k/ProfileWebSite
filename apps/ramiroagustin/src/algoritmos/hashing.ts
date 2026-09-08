import type { Frase } from "../i18n/idioma";
import type {
  CurvaPlano,
  EscenaPlano,
  ItemPanel,
  PasoEscena,
  PuntoPlano,
} from "./escena";

/**
 * Hashing consistente: cómo se reparte carga sin que agregar una máquina
 * obligue a mover todo.
 *
 * El truco es no dividir por la cantidad de servidores. Con `hash % N`, cambiar
 * N le cambia el dueño a casi todas las claves; en un caché eso es perder el
 * caché entero, y en una base repartida, mover todos los datos. El anillo
 * cambia solo el tramo del que se fue.
 *
 * Los nodos virtuales no son un detalle de implementación: sin ellos el
 * reparto sale torcido, y con cuatro servidores puede tocar que uno se lleve
 * la mitad. El escenario «Sin nodos virtuales» es exactamente eso.
 */

const SERVIDORES = ["alfa", "beta", "gama", "delta"];
const CLAVES = Array.from({ length: 24 }, (_, i) => `sesion-${100 + i * 7}`);
const CAE = "gama";

/** FNV-1a de 32 bits: corto, determinista y suficiente para repartir. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

const ANG = (s: string) => (hash(s) % 100000) / 100000; // 0..1 de vuelta al anillo

const CX = 50;
const CY = 50;
const R_ANILLO = 37;
const R_CLAVE = 27;

const enCirculo = (t: number, r: number) => ({
  x: CX + Math.cos(t * Math.PI * 2 - Math.PI / 2) * r,
  y: CY + Math.sin(t * Math.PI * 2 - Math.PI / 2) * r,
});

type Virtual = { servidor: string; t: number; nombre: string };

export function correrHashing(escenario: string): PasoEscena[] {
  const modulo = escenario === "modulo";
  const replicas = escenario === "sinvirtuales" ? 1 : 8;

  let vivos = [...SERVIDORES];
  let virtuales: Virtual[] = [];

  const rearmar = () => {
    virtuales = vivos
      .flatMap((s) =>
        Array.from({ length: replicas }, (_, i) => ({
          servidor: s,
          t: ANG(`${s}#${i}`),
          nombre: `${s}#${i}`,
        })),
      )
      .sort((a, b) => a.t - b.t);
  };
  rearmar();

  /** El dueño de una clave: el primer nodo del anillo a partir de su punto. */
  const dueno = (clave: string): string => {
    if (modulo) return vivos[hash(clave) % vivos.length]!;
    const t = ANG(clave);
    return (virtuales.find((v) => v.t >= t) ?? virtuales[0]!).servidor;
  };

  const asignado = new Map<string, string>();
  let mirando: string | null = null;
  const movidas = new Set<string>();

  const color = (s: string) => SERVIDORES.indexOf(s);

  const escena = (): EscenaPlano => {
    const curvas: CurvaPlano[] = [];

    if (!modulo) {
      // Cada tramo del anillo pintado del color de su dueño. Es la única forma
      // de que se vea que sacar un nodo solo repinta un pedazo.
      for (let i = 0; i < virtuales.length; i++) {
        const desde =
          i === 0 ? virtuales[virtuales.length - 1]!.t - 1 : virtuales[i - 1]!.t;
        const hasta = virtuales[i]!.t;
        const n = Math.max(2, Math.round((hasta - desde) * 90));
        curvas.push({
          grupo: color(virtuales[i]!.servidor),
          puntos: Array.from({ length: n }, (_, j) =>
            enCirculo(desde + ((hasta - desde) * j) / (n - 1), R_ANILLO),
          ),
        });
      }
    } else {
      curvas.push({
        tenue: true,
        puntos: Array.from({ length: 90 }, (_, i) => enCirculo(i / 89, R_ANILLO)),
      });
    }

    const puntos: PuntoPlano[] = [];

    if (!modulo) {
      for (const v of virtuales) {
        const p = enCirculo(v.t, R_ANILLO);
        puntos.push({
          ...p,
          grupo: color(v.servidor),
          forma: "nodo",
          nombre: replicas === 1 ? v.servidor : undefined,
        });
      }
    } else {
      vivos.forEach((s, i) => {
        puntos.push({
          x: 50 + (i - (vivos.length - 1) / 2) * 16,
          y: 50,
          grupo: color(s),
          forma: "nodo",
          nombre: s,
        });
      });
    }

    for (const c of CLAVES) {
      const d = asignado.get(c);
      const p = enCirculo(ANG(c), R_CLAVE);
      puntos.push({
        ...p,
        grupo: d ? color(d) : undefined,
        forma: "punto",
        estado: c === mirando ? "activo" : movidas.has(c) ? "destacado" : undefined,
      });
    }

    return { tipo: "plano", curvas, puntos, ejes: { x: "", y: "" } };
  };

  const panel = (): ItemPanel[] => {
    const filas: ItemPanel[] = SERVIDORES.map((s) => {
      const n = [...asignado.values()].filter((d) => d === s).length;
      return {
        clave: s,
        texto: vivos.includes(s)
          ? {
              es: `${n} ${n === 1 ? "clave" : "claves"}`,
              en: `${n} ${n === 1 ? "key" : "keys"}`,
            }
          : { es: "caído", en: "down" },
        nota: vivos.includes(s)
          ? {
              es: `${Math.round((n / CLAVES.length) * 100)}% de la carga`,
              en: `${Math.round((n / CLAVES.length) * 100)}% of the load`,
            }
          : undefined,
        destacado: !vivos.includes(s),
      };
    });
    if (movidas.size) {
      filas.push({
        clave: { es: "claves movidas", en: "keys moved" },
        texto: {
          es: `${movidas.size} de ${CLAVES.length}`,
          en: `${movidas.size} of ${CLAVES.length}`,
        },
        nota: `${Math.round((movidas.size / CLAVES.length) * 100)}%`,
        destacado: true,
      });
    }
    return filas;
  };

  const pasos: PasoEscena[] = [];
  const paso = (linea: number, texto: Frase) =>
    pasos.push({ linea, texto, escena: escena(), panel: panel() });

  // ── Arranque ───────────────────────────────────────────────────────────
  paso(
    modulo ? 2 : 6,
    modulo
      ? {
          es: `Cuatro servidores y ${CLAVES.length} claves, repartidas con <code>hash(clave) % 4</code>. Es lo primero que uno escribe, reparte parejo y funciona. <em>El problema aparece recién cuando el 4 cambia.</em>`,
          en: `Four servers and ${CLAVES.length} keys, spread with <code>hash(key) % 4</code>. It is the first thing anyone writes, it spreads evenly and it works. <em>The trouble only shows up when the 4 changes.</em>`,
        }
      : {
          es: `Un círculo. Cada servidor se hashea a un punto de ese círculo${
            replicas > 1
              ? `, y no una vez sino <b>${replicas}</b>: son sus <b>nodos virtuales</b>`
              : ""
          }. Las claves se hashean al mismo círculo. <b>Ningún hash sabe cuántos servidores hay</b> — y ahí está todo el truco.`,
          en: `A circle. Every server hashes to a point on that circle${
            replicas > 1
              ? `, and not once but <b>${replicas}</b> times: those are its <b>virtual nodes</b>`
              : ""
          }. The keys hash onto the same circle. <b>No hash knows how many servers there are</b> — and that is the whole trick.`,
        },
  );

  // ── Asignación ─────────────────────────────────────────────────────────
  for (let i = 0; i < CLAVES.length; i++) {
    const c = CLAVES[i]!;
    asignado.set(c, dueno(c));
    if (i < 4) {
      mirando = c;
      paso(
        modulo ? 2 : 10,
        modulo
          ? {
              es: `<code>${c}</code> → <code>hash % 4</code> → <b>${asignado.get(c)}</b>. Directo, sin buscar nada.`,
              en: `<code>${c}</code> → <code>hash % 4</code> → <b>${asignado.get(c)}</b>. Straight there, nothing to look up.`,
            }
          : {
              es: `<code>${c}</code> cae en un punto del anillo y camina en el sentido de las agujas hasta toparse con el primer nodo: <b>${asignado.get(c)}</b>. <em>No se calculó ningún índice ni se dividió por nada.</em>`,
              en: `<code>${c}</code> lands on a point of the ring and walks clockwise until it bumps into the first node: <b>${asignado.get(c)}</b>. <em>No index was computed and nothing was divided by anything.</em>`,
            },
      );
    }
  }
  mirando = null;

  const antes = new Map(asignado);
  const cargaInicial = SERVIDORES.map(
    (s) => [...asignado.values()].filter((d) => d === s).length,
  );
  const desbalance = Math.max(...cargaInicial) / (CLAVES.length / SERVIDORES.length);

  paso(modulo ? 3 : 6, {
    es: `Las ${CLAVES.length} repartidas: ${SERVIDORES.map((s, i) => `<b>${s}</b> ${cargaInicial[i]}`).join(", ")}. ${
      replicas === 1 && !modulo
        ? `Y ya se ve el problema de tener un solo punto por servidor: el más cargado se lleva <b>${Math.round(desbalance * 100)}%</b> de lo que le tocaría en un reparto parejo. Cuatro puntos al azar en un círculo casi nunca lo parten en cuatro pedazos iguales.`
        : "Un reparto razonable."
    }`,
    en: `All ${CLAVES.length} spread out: ${SERVIDORES.map((s, i) => `<b>${s}</b> ${cargaInicial[i]}`).join(", ")}. ${
      replicas === 1 && !modulo
        ? `And the problem with a single point per server is already visible: the busiest one carries <b>${Math.round(desbalance * 100)}%</b> of what an even split would give it. Four random points on a circle almost never cut it into four equal pieces.`
        : "A reasonable split."
    }`,
  });

  // ── Se cae un servidor ─────────────────────────────────────────────────
  vivos = vivos.filter((s) => s !== CAE);
  rearmar();

  paso(modulo ? 3 : 14, {
    es: `Se cae <b>${CAE}</b>. ${
      modulo
        ? "Quedan tres servidores, así que la cuenta pasa a ser <code>hash % 3</code>. <em>Y esa cuenta le cambia el resultado a casi todas las claves, no solo a las de gama.</em>"
        : `Sus ${replicas} ${replicas === 1 ? "punto sale" : "puntos salen"} del anillo. Nada más cambia: los otros nodos están donde estaban.`
    }`,
    en: `<b>${CAE}</b> goes down. ${
      modulo
        ? "Three servers are left, so the arithmetic becomes <code>hash % 3</code>. <em>And that arithmetic changes the answer for almost every key, not just the ones on gama.</em>"
        : `Its ${replicas} ${replicas === 1 ? "point leaves" : "points leave"} the ring. Nothing else changes: the other nodes are exactly where they were.`
    }`,
  });

  for (const c of CLAVES) {
    const nuevo = dueno(c);
    asignado.set(c, nuevo);
    if (antes.get(c) !== nuevo) movidas.add(c);
  }

  const eranDeCaido = [...antes.entries()].filter(([, d]) => d === CAE).length;

  paso(
    modulo ? 2 : 10,
    modulo
      ? {
          es: `Reasignado todo: <b>${movidas.size} de ${CLAVES.length}</b> claves cambiaron de servidor. Solo ${eranDeCaido} eran de ${CAE}; las otras ${movidas.size - eranDeCaido} <b>se movieron sin motivo</b>, entre servidores que no se cayeron.`,
          en: `Everything reassigned: <b>${movidas.size} of ${CLAVES.length}</b> keys changed server. Only ${eranDeCaido} of them belonged to ${CAE}; the other ${movidas.size - eranDeCaido} <b>moved for no reason at all</b>, between servers that never went down.`,
        }
      : {
          es: `Reasignado: <b>${movidas.size} de ${CLAVES.length}</b> claves cambiaron de dueño, y son exactamente las ${eranDeCaido} que estaban en ${CAE}. <em>Ni una sola clave de los otros tres se movió</em>, porque los tramos de anillo que cubrían no se tocaron.`,
          en: `Reassigned: <b>${movidas.size} of ${CLAVES.length}</b> keys changed owner, and they are exactly the ${eranDeCaido} that lived on ${CAE}. <em>Not a single key from the other three moved</em>, because the stretches of ring they covered were never touched.`,
        },
  );

  // ── Cierre ─────────────────────────────────────────────────────────────
  const pct = Math.round((movidas.size / CLAVES.length) * 100);
  const cargaFinal = vivos.map(
    (s) => [...asignado.values()].filter((d) => d === s).length,
  );

  pasos.push({
    linea: 0,
    texto: { es: `Listo.`, en: `Done.` },
    escena: escena(),
    panel: panel(),
    veredicto: modulo
      ? {
          es: `Se cayó <b>un</b> servidor de cuatro y se movió el <b>${pct}%</b> de las claves. Si esto fuera un caché, se perdió casi entero de golpe y la base de datos se come toda esa carga a la vez — la <em>estampida de caché</em> clásica. Si fuera una base repartida, hay que mover el ${pct}% de los datos por la red. <b>Todo eso por dividir por N.</b> Probá el escenario del anillo.`,
          en: `<b>One</b> server out of four went down and <b>${pct}%</b> of the keys moved. If this were a cache, almost all of it was lost at once and the database eats that whole load in one go — the classic <em>cache stampede</em>. If it were a distributed store, ${pct}% of the data has to travel over the network. <b>All of that for dividing by N.</b> Try the ring scenario.`,
        }
      : replicas === 1
        ? {
            es: `Se movió el <b>${pct}%</b> de las claves, solo las del caído: eso funciona. Pero mirá el reparto que quedó — ${vivos.map((s, i) => `<b>${s}</b> ${cargaFinal[i]}`).join(", ")}—: con un solo punto por servidor, <em>el que hereda el tramo del caído se come todo el tramo entero</em>. Con ${8} nodos virtuales cada uno, ese tramo se reparte entre los tres. Por eso las réplicas virtuales no son opcionales.`,
            en: `<b>${pct}%</b> of the keys moved, only the ones from the server that went down: that part works. But look at the split it left — ${vivos.map((s, i) => `<b>${s}</b> ${cargaFinal[i]}`).join(", ")}—: with a single point per server, <em>whoever inherits the dead node's stretch swallows the entire stretch</em>. With ${8} virtual nodes each, that stretch is shared out among the three. That is why virtual replicas are not optional.`,
          }
        : {
            es: `Se movió el <b>${pct}%</b> de las claves: solo las del servidor que se cayó, ni una más. Con N servidores, sacar uno mueve <b>1/N</b> de los datos y el resto ni se entera — es la propiedad que hace posible agregar y sacar máquinas de un caché o una base repartida sin planificar una migración. <em>Comparalo con «Dividiendo por N».</em> Es la misma caída y el mismo hash.`,
            en: `<b>${pct}%</b> of the keys moved: only the ones from the server that went down, not one more. With N servers, removing one moves <b>1/N</b> of the data and the rest never notices — it is the property that makes adding and removing machines from a cache or a distributed store possible without planning a migration. <em>Compare it with «Dividing by N».</em> Same failure, same hash.`,
          },
  });

  return pasos;
}
