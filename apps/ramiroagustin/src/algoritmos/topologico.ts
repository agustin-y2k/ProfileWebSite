import type { Frase } from "../i18n/idioma";
import type { AristaGrafo, EscenaGrafo, ItemPanel, PasoEscena } from "./escena";

/**
 * Orden topológico por el algoritmo de Kahn, sobre este mismo repositorio.
 *
 * El grafo no es de ejemplo: son los seis paquetes de `pnpm-workspace.yaml` y
 * las dependencias que declaran sus `package.json`. Es lo que pnpm resuelve
 * antes de correr un build, y también lo que hacen apt, cargo, un Makefile y
 * la planificación de cualquier obra: poner en fila cosas que solo saben a
 * quién necesitan, no en qué momento van.
 *
 * El escenario del ciclo importa tanto como el que funciona: el algoritmo no
 * detecta el ciclo con un chequeo aparte, sino por quedarse sin candidatos con
 * trabajo sin terminar. Ese «sobraron paquetes» es, literalmente, el error que
 * tira pnpm.
 */

type Paquete = { id: string; nombre: string; x: number; y: number };

const PAQUETES: Paquete[] = [
  { id: "tokens", nombre: "sites/tokens", x: 13, y: 20 },
  { id: "negocio", nombre: "sites/negocio", x: 13, y: 76 },
  { id: "ui", nombre: "sites/ui", x: 47, y: 20 },
  { id: "taller", nombre: "taller", x: 47, y: 80 },
  { id: "ramiro", nombre: "ramiroagustin", x: 85, y: 14 },
  { id: "bytefix", nombre: "bytefix", x: 85, y: 52 },
];

/** [de, a] se lee «`a` no puede compilarse antes que `de`». */
const DEPENDENCIAS: [string, string][] = [
  ["tokens", "ui"],
  ["tokens", "ramiro"],
  ["tokens", "bytefix"],
  ["ui", "ramiro"],
  ["ui", "bytefix"],
  ["negocio", "bytefix"],
  ["negocio", "taller"],
];

/** El import que nadie quiso hacer: `@sites/ui` tirando de `@sites/negocio`. */
const CICLO: [string, string][] = [
  ["ui", "negocio"],
  ["negocio", "ui"],
];

export function correrTopologico(escenario: string): PasoEscena[] {
  const conCiclo = escenario === "ciclo";
  const pila = escenario === "pila";
  const aristas = conCiclo ? [...DEPENDENCIAS, ...CICLO] : DEPENDENCIAS;

  const grado = new Map(PAQUETES.map((p) => [p.id, 0]));
  for (const [, a] of aristas) grado.set(a, grado.get(a)! + 1);

  const emitido = new Map<string, number>();
  const listos: string[] = [];
  let mirando: string | null = null;
  let cortada: [string, string] | null = null;

  const pasos: PasoEscena[] = [];
  const nombreDe = (id: string) => PAQUETES.find((p) => p.id === id)!.nombre;

  const escena = (): EscenaGrafo => ({
    tipo: "grafo",
    nodos: PAQUETES.map((p) => {
      const n = emitido.get(p.id);
      return {
        id: p.id,
        x: p.x,
        y: p.y,
        nombre: p.nombre,
        etiqueta:
          n !== undefined
            ? { es: `${n}º`, en: `#${n}` }
            : grado.get(p.id) === 0
              ? { es: "listo", en: "ready" }
              : { es: `espera ${grado.get(p.id)}`, en: `waits on ${grado.get(p.id)}` },
        estado:
          p.id === mirando
            ? "activo"
            : n !== undefined
              ? "cerrado"
              : grado.get(p.id) === 0
                ? "pendiente"
                : "normal",
      };
    }),
    aristas: aristas.map(([de, a]): AristaGrafo => {
      const esCiclo = CICLO.some(([x, y]) => x === de && y === a);
      return {
        a: de,
        b: a,
        flecha: true,
        curva: esCiclo ? 10 : undefined,
        estado:
          cortada && cortada[0] === de && cortada[1] === a
            ? "mirando"
            : emitido.has(de)
              ? "tenue"
              : esCiclo
                ? "apagada"
                : "normal",
      };
    }),
  });

  const panel = (): ItemPanel[] => [
    ...listos.map((id, i) => ({
      clave: nombreDe(id),
      texto: { es: "puede compilarse ya", en: "can be built right now" },
      nota:
        i === 0
          ? { es: "el próximo", en: "up next" }
          : pila
            ? { es: "en la pila", en: "on the stack" }
            : { es: "en la cola", en: "in the queue" },
      destacado: i === 0,
    })),
    ...PAQUETES.filter((p) => !listos.includes(p.id) && !emitido.has(p.id)).map((p) => ({
      clave: p.nombre,
      texto: {
        es: `espera a ${grado.get(p.id)}`,
        en: `waiting on ${grado.get(p.id)}`,
      },
    })),
  ];

  const paso = (linea: number, texto: Frase) =>
    pasos.push({ linea, texto, escena: escena(), panel: panel() });

  // ── Grados de entrada ──────────────────────────────────────────────────
  paso(4, {
    es: `Seis paquetes de este repositorio y ${aristas.length} dependencias declaradas. Lo primero es contar, para cada uno, <b>a cuántos tiene que esperar</b>. Nada más que eso: no hace falta entender las dependencias, solo contarlas.`,
    en: `Six packages from this repository and ${aristas.length} declared dependencies. The first thing to do is count, for each one, <b>how many it has to wait for</b>. Nothing more than that: you do not need to understand the dependencies, only count them.`,
  });

  for (const p of PAQUETES) if (grado.get(p.id) === 0) listos.push(p.id);

  paso(7, {
    es: `Los que no esperan a nadie pueden compilarse ya mismo: <b>${listos.map(nombreDe).join("</b> y <b>")}</b>. ${
      conCiclo
        ? "Uno solo, y eso ya es una mala señal."
        : "Son los paquetes hoja del monorepo, los que no importan nada de adentro."
    }`,
    en: `The ones waiting on nobody can be built right away: <b>${listos.map(nombreDe).join("</b> and <b>")}</b>. ${
      conCiclo
        ? "Just one, and that is already a bad sign."
        : "They are the leaf packages of the monorepo, the ones that import nothing from inside it."
    }`,
  });

  // ── Bucle de Kahn ──────────────────────────────────────────────────────
  let n = 0;
  while (listos.length) {
    // Cola o pila: la única diferencia entre los dos escenarios que funcionan.
    const actual = pila ? listos.pop()! : listos.shift()!;
    mirando = actual;
    n++;
    emitido.set(actual, n);

    paso(12, {
      es: `Sale <b>${nombreDe(actual)}</b> y se anota ${n}º en el orden. ${
        pila
          ? "Como acá saco el último que entró, el recorrido se mete a fondo por una rama antes de volver."
          : "Sale el que más tiempo llevaba esperando: es una cola común."
      }`,
      en: `<b>${nombreDe(actual)}</b> comes out and takes place #${n} in the order. ${
        pila
          ? "Since I pop the last one in here, the traversal dives deep down one branch before coming back."
          : "The one that had been waiting longest comes out: it is a plain queue."
      }`,
    });

    const dependientes = aristas.filter(([de]) => de === actual);
    for (const [, dep] of dependientes) {
      cortada = [actual, dep];
      grado.set(dep, grado.get(dep)! - 1);
      const queda = grado.get(dep)!;

      if (queda === 0) {
        listos.push(dep);
        paso(16, {
          es: `<b>${nombreDe(dep)}</b> tacha a ${nombreDe(actual)} de su lista y ya no espera a nadie: <b>entra a la cola</b>. Su turno llegó porque todo lo que necesitaba ya está compilado, no porque alguien lo haya puesto ahí a mano.`,
          en: `<b>${nombreDe(dep)}</b> crosses ${nombreDe(actual)} off its list and is now waiting on nobody: <b>into the queue it goes</b>. Its turn came because everything it needed is already built, not because someone put it there by hand.`,
        });
      } else {
        paso(16, {
          es: `<b>${nombreDe(dep)}</b> tacha a ${nombreDe(actual)}, pero todavía le ${queda === 1 ? "queda 1" : `quedan ${queda}`} por esperar. Sigue afuera.`,
          en: `<b>${nombreDe(dep)}</b> crosses ${nombreDe(actual)} off, but still has ${queda === 1 ? "1 more" : `${queda} more`} to wait for. It stays out.`,
        });
      }
    }
    cortada = null;
  }

  mirando = null;

  // ── Cierre ─────────────────────────────────────────────────────────────
  const faltan = PAQUETES.length - emitido.size;
  const orden = [...emitido.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => nombreDe(id));

  pasos.push({
    linea: faltan ? 21 : 22,
    texto: faltan
      ? {
          es: `Se acabaron los candidatos y todavía quedan <b>${faltan}</b> paquetes sin compilar.`,
          en: `The candidates ran out and <b>${faltan}</b> packages are still unbuilt.`,
        }
      : {
          es: `Los seis en fila, cada uno después de todo lo que necesita.`,
          en: `All six lined up, each one after everything it needs.`,
        },
    escena: escena(),
    panel: panel(),
    veredicto: faltan
      ? {
          es: `La cola se vació con <b>${faltan}</b> paquetes adentro. No hay error que reportar más allá de eso: <em>si nadie puede empezar, es porque se están esperando entre ellos</em>. Acá el ciclo es <code>@sites/ui → @sites/negocio → @sites/ui</code>, y así es exactamente como lo descubre pnpm — no con un chequeo aparte, sino quedándose sin trabajo con trabajo pendiente.`,
          en: `The queue emptied with <b>${faltan}</b> packages still in there. There is no error to report beyond that: <em>if nobody can start, it is because they are waiting on each other</em>. Here the cycle is <code>@sites/ui → @sites/negocio → @sites/ui</code>, and that is exactly how pnpm finds it — not with a separate check, but by running out of work while work is still pending.`,
        }
      : {
          es: `Orden: <b>${orden.join(" → ")}</b>. ${
            pila
              ? "Es distinto del que sale con una cola, y los dos son igual de correctos: <em>un orden topológico casi nunca es único</em>. Esa libertad es justo lo que le permite a pnpm compilar varios paquetes a la vez."
              : "Cada uno se compila después de todo lo que importa. <em>Probá «Con una pila» para ver que este orden no es el único, y «Con un ciclo» para ver cómo se rompe.</em>"
          }`,
          en: `Order: <b>${orden.join(" → ")}</b>. ${
            pila
              ? "It differs from the one a queue produces, and both are equally correct: <em>a topological order is almost never unique</em>. That freedom is precisely what lets pnpm build several packages at once."
              : "Each one builds after everything it imports. <em>Try «With a stack» to see that this order is not the only one, and «With a cycle» to see how it breaks.</em>"
          }`,
        },
  });

  return pasos;
}
