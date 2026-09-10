import type { Frase } from "../i18n/idioma";
import type {
  AristaGrafo,
  EscenaGrafo,
  ItemPanel,
  NodoGrafo,
  PasoEscena,
} from "./escena";

/**
 * Union-Find, la estructura que contesta «¿estos dos ya están conectados?».
 *
 * Es el ejemplo más limpio que existe de dos optimizaciones chiquitas que
 * cambian la complejidad de la estructura entera: unión por tamaño y
 * compresión de caminos. Cada una es una línea, y las dos se ven en pantalla
 * como lo que son — árboles que dejan de crecer para abajo.
 *
 * Los tres escenarios corren las mismas operaciones con reglas distintas, así
 * que la diferencia de profundidad que se ve en pantalla es enteramente de las
 * dos líneas que cambian.
 */

const ELEMENTOS: string[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

type Operacion = { tipo: "unir"; a: string; b: string } | { tipo: "buscar"; a: string };

/** Uniones balanceadas: es el peor caso que la unión por tamaño permite. */
const BALANCEADO: Operacion[] = [
  { tipo: "unir", a: "A", b: "B" },
  { tipo: "unir", a: "C", b: "D" },
  { tipo: "unir", a: "E", b: "F" },
  { tipo: "unir", a: "G", b: "H" },
  { tipo: "unir", a: "B", b: "D" },
  { tipo: "unir", a: "F", b: "H" },
  { tipo: "unir", a: "D", b: "H" },
  { tipo: "buscar", a: "H" },
  { tipo: "unir", a: "A", b: "G" },
];

/** El orden que hunde a la versión ingenua: cada unión alarga la misma fila. */
const CADENA: Operacion[] = [
  ...ELEMENTOS.slice(0, -1).map((e, i) => ({
    tipo: "unir" as const,
    a: e,
    b: ELEMENTOS[i + 1]!,
  })),
  { tipo: "buscar", a: "A" },
];

export function correrUnionFind(escenario: string): PasoEscena[] {
  const porTamano = escenario !== "ingenuo";
  const comprime = escenario === "compresion";
  const guion = escenario === "ingenuo" ? CADENA : BALANCEADO;

  const padre = new Map(ELEMENTOS.map((e) => [e, e as string]));
  const tam = new Map(ELEMENTOS.map((e) => [e, 1]));

  let activo: string | null = null;
  let resaltada: [string, string] | null = null;
  let caminados = 0;

  const raizDe = (x: string): string => {
    let cur = x;
    while (padre.get(cur) !== cur) cur = padre.get(cur)!;
    return cur;
  };

  const profundidad = (x: string) => {
    let d = 0;
    let cur = x;
    while (padre.get(cur) !== cur) {
      cur = padre.get(cur)!;
      d++;
    }
    return d;
  };

  const maxProfundidad = () => Math.max(...ELEMENTOS.map(profundidad));

  /**
   * Cada paso redibuja el bosque entero desde los punteros a padre: no hay
   * posiciones guardadas. Es lo que hace que la compresión se vea como lo que
   * es —los nodos suben de golpe— en vez de como una animación decorativa.
   */
  const escena = (): EscenaGrafo => {
    const hijos = new Map<string, string[]>(ELEMENTOS.map((e) => [e, []]));
    for (const e of ELEMENTOS) {
      const p = padre.get(e)!;
      if (p !== e) hijos.get(p)!.push(e);
    }

    const hondo = Math.max(1, maxProfundidad());
    const pos = new Map<string, { x: number; y: number }>();
    let hoja = 0;

    const ubicar = (nodo: string, prof: number): number => {
      const cs = hijos.get(nodo)!;
      let x: number;
      if (cs.length === 0) {
        x = ((hoja + 0.5) / ELEMENTOS.length) * 100;
        hoja++;
      } else {
        const xs = cs.map((c) => ubicar(c, prof + 1));
        x = (Math.min(...xs) + Math.max(...xs)) / 2;
      }
      pos.set(nodo, { x, y: 12 + (prof / hondo) * 74 });
      return x;
    };

    for (const e of ELEMENTOS) if (padre.get(e) === e) ubicar(e, 0);

    const nodos: NodoGrafo[] = ELEMENTOS.map((e) => {
      const p = pos.get(e)!;
      const raiz = padre.get(e) === e;
      return {
        id: e,
        x: p.x,
        y: p.y,
        nombre: e,
        etiqueta: raiz
          ? { es: `raíz · ${tam.get(raizDe(e))}`, en: `root · ${tam.get(raizDe(e))}` }
          : undefined,
        estado: e === activo ? "activo" : raiz ? "destacado" : "normal",
      };
    });

    const aristas: AristaGrafo[] = [];
    for (const e of ELEMENTOS) {
      const p = padre.get(e)!;
      if (p === e) continue;
      aristas.push({
        a: e,
        b: p,
        flecha: true,
        estado:
          resaltada && resaltada[0] === e && resaltada[1] === p ? "mirando" : "arbol",
      });
    }

    return { tipo: "grafo", nodos, aristas };
  };

  const panel = (): ItemPanel[] => {
    const raices = ELEMENTOS.filter((e) => padre.get(e) === e);
    return raices.map((r) => {
      const miembros = ELEMENTOS.filter((e) => raizDe(e) === r);
      return {
        clave: `{${miembros.join(" ")}}`,
        texto: {
          es: `${miembros.length} ${miembros.length === 1 ? "elemento" : "elementos"}`,
          en: `${miembros.length} ${miembros.length === 1 ? "element" : "elements"}`,
        },
        nota: {
          es: `raíz ${r} · hondura ${Math.max(...miembros.map(profundidad))}`,
          en: `root ${r} · depth ${Math.max(...miembros.map(profundidad))}`,
        },
        destacado: miembros.length > 1,
      };
    });
  };

  const pasos: PasoEscena[] = [];
  const paso = (linea: number, texto: Frase) =>
    pasos.push({ linea, texto, escena: escena(), panel: panel() });

  paso(1, {
    es: `Ocho elementos sueltos, cada uno su propio conjunto. La estructura solo sabe contestar dos cosas: <b>«unilos»</b> y <b>«¿estos dos ya están juntos?»</b>. Todo lo demás sale de ahí. ${
      porTamano
        ? comprime
          ? "Esta corrida usa las dos optimizaciones."
          : "Esta corrida cuelga el conjunto chico del grande, pero no aplana nada."
        : "Esta corrida es la ingenua: el primero se cuelga del segundo y listo."
    }`,
    en: `Eight loose elements, each one its own set. The structure only knows how to answer two things: <b>«join them»</b> and <b>«are these two already together?»</b>. Everything else follows from that. ${
      porTamano
        ? comprime
          ? "This run uses both optimisations."
          : "This run hangs the small set off the large one, but flattens nothing."
        : "This run is the naive one: the first hangs off the second and that is it."
    }`,
  });

  // ── Guion ──────────────────────────────────────────────────────────────
  for (const op of guion) {
    if (op.tipo === "buscar") {
      // El paseo hacia arriba, un salto por paso: es lo único que hace un
      // find, y lo que la compresión existe para acortar.
      let cur = op.a;
      let saltos = 0;
      const recorrido: string[] = [];

      while (padre.get(cur) !== cur) {
        activo = cur;
        resaltada = [cur, padre.get(cur)!];
        recorrido.push(cur);
        saltos++;
        paso(3, {
          es: `Busco la raíz de <b>${op.a}</b>: subo de <b>${cur}</b> a <b>${padre.get(cur)}</b>. Salto ${saltos}. <em>Cada salto es una lectura de memoria — por eso la hondura del árbol es el costo de la estructura.</em>`,
          en: `Looking for the root of <b>${op.a}</b>: I climb from <b>${cur}</b> to <b>${padre.get(cur)}</b>. Hop ${saltos}. <em>Every hop is a memory read — which is why the depth of the tree is the cost of the structure.</em>`,
        });
        cur = padre.get(cur)!;
      }

      caminados += saltos;
      activo = cur;
      resaltada = null;
      paso(6, {
        es: `La raíz es <b>${cur}</b>. Hicieron falta <b>${saltos}</b> ${saltos === 1 ? "salto" : "saltos"}.`,
        en: `The root is <b>${cur}</b>. It took <b>${saltos}</b> ${saltos === 1 ? "hop" : "hops"}.`,
      });

      if (comprime && recorrido.length > 1) {
        for (const nodo of recorrido) padre.set(nodo, cur);
        activo = null;
        paso(4, {
          es: `Y ahora lo que hace toda la diferencia: <b>ya que subí, cuelgo de la raíz a todos los que pisé en el camino</b>. No cambia a qué conjunto pertenecen —eso lo define la raíz, y sigue siendo la misma— pero la próxima consulta sobre cualquiera de ellos cuesta <b>un solo salto</b>.`,
          en: `And now the thing that makes all the difference: <b>since I climbed anyway, I hang every node I stepped on straight off the root</b>. It does not change which set they belong to —the root defines that, and it is the same root— but the next query on any of them costs <b>a single hop</b>.`,
        });
      } else if (recorrido.length > 1) {
        paso(6, {
          es: `El árbol queda igual que antes: la próxima consulta sobre <b>${op.a}</b> va a volver a caminar los mismos ${saltos} saltos. <em>Y la siguiente también.</em>`,
          en: `The tree is left exactly as it was: the next query on <b>${op.a}</b> will walk the same ${saltos} hops again. <em>And so will the one after that.</em>`,
        });
      }
      activo = null;
      continue;
    }

    const ra = raizDe(op.a);
    const rb = raizDe(op.b);
    caminados += profundidad(op.a) + profundidad(op.b);

    if (ra === rb) {
      activo = null;
      paso(11, {
        es: `<b>unir(${op.a}, ${op.b})</b>: los dos ya tienen la misma raíz, <b>${ra}</b>, así que no hay nada que hacer. <em>Y ese «nada que hacer» es la respuesta útil</em>: pedir una unión que ya estaba hecha es, exactamente, haber encontrado un ciclo — sin recorrer nada y sin buscarlo.`,
        en: `<b>union(${op.a}, ${op.b})</b>: both already share the same root, <b>${ra}</b>, so there is nothing to do. <em>And that «nothing to do» is the useful answer</em>: asking for a union that already holds is, precisely, having found a cycle — without walking anything and without looking for it.`,
      });
      continue;
    }

    let arriba = ra;
    let abajo = rb;
    if (porTamano && tam.get(rb)! > tam.get(ra)!) {
      arriba = rb;
      abajo = ra;
    } else if (!porTamano) {
      arriba = rb;
      abajo = ra;
    }

    paso(10, {
      es: `<b>unir(${op.a}, ${op.b})</b>: uno está en el conjunto de <b>${ra}</b> y el otro en el de <b>${rb}</b>. Son distintos, así que hay que fusionarlos.`,
      en: `<b>union(${op.a}, ${op.b})</b>: one is in <b>${ra}</b>'s set and the other in <b>${rb}</b>'s. They are different, so they have to be merged.`,
    });

    padre.set(abajo, arriba);
    tam.set(arriba, tam.get(arriba)! + tam.get(abajo)!);
    activo = abajo;
    resaltada = [abajo, arriba];

    paso(
      porTamano ? 14 : 15,
      porTamano
        ? {
            es: `Cuelgo <b>${abajo}</b> (${tam.get(abajo)} ${tam.get(abajo) === 1 ? "elemento" : "elementos"}) de <b>${arriba}</b>, que es el más grande. <em>Siempre el chico del grande</em>: así solo se hunden los elementos del conjunto chico, y ninguno puede bajar más de log₂(n) veces en toda su vida.`,
            en: `I hang <b>${abajo}</b> (${tam.get(abajo)} ${tam.get(abajo) === 1 ? "element" : "elements"}) off <b>${arriba}</b>, the larger one. <em>Always the small one under the big one</em>: that way only the small set's elements sink, and none of them can sink more than log₂(n) times in its whole life.`,
          }
        : {
            es: `Cuelgo <b>${abajo}</b> de <b>${arriba}</b> sin mirar los tamaños. Es lo que sale natural de escribir <code>padre[ra] = rb</code>, y es justo lo que va alargando la fila.`,
            en: `I hang <b>${abajo}</b> off <b>${arriba}</b> without looking at the sizes. It is what falls out of writing <code>parent[ra] = rb</code>, and it is exactly what keeps stretching the chain.`,
          },
    );

    resaltada = null;
    activo = null;
  }

  // ── Cierre ─────────────────────────────────────────────────────────────
  const hondura = maxProfundidad();

  pasos.push({
    linea: 0,
    texto: { es: `Terminó el guion.`, en: `End of the script.` },
    escena: escena(),
    panel: panel(),
    veredicto: !porTamano
      ? {
          es: `El árbol quedó con <b>${hondura}</b> de hondura: una fila india. Consultar el elemento del fondo cuesta ${hondura} saltos, y con un millón de elementos costaría un millón. <em>La estructura degeneró en una lista enlazada</em>, que es exactamente lo que no queríamos. Y lo único que hace falta para arreglarlo es mirar los tamaños antes de colgar.`,
          en: `The tree ended up <b>${hondura}</b> deep: a single file. Querying the element at the bottom costs ${hondura} hops, and with a million elements it would cost a million. <em>The structure degenerated into a linked list</em>, which is exactly what we did not want. And all it takes to fix it is looking at the sizes before hanging one off the other.`,
        }
      : comprime
        ? {
            es: `Hondura final: <b>${hondura}</b>, y los tres nodos que el <code>buscar</code> pisó quedaron colgando <b>directo de la raíz</b>: consultarlos de nuevo cuesta un salto. <em>La compresión solo aplana el camino que se caminó</em>, y eso alcanza, porque el que se consulta es el que se vuelve a consultar. Con las dos optimizaciones juntas, m operaciones sobre n elementos cuestan <b>O(m·α(n))</b> — y α, la inversa de Ackermann, vale menos de 5 para cualquier n que entre en este universo. <em>Es lo más cerca de O(1) que llega algo que no lo es.</em>`,
            en: `Final depth: <b>${hondura}</b>, and the three nodes the <code>find</code> stepped on ended up hanging <b>straight off the root</b>: querying them again costs one hop. <em>Compression only flattens the path that was actually walked</em>, and that is enough, because whatever gets queried is what gets queried again. With both optimisations together, m operations over n elements cost <b>O(m·α(n))</b> — and α, the inverse Ackermann function, is under 5 for any n that fits in this universe. <em>It is as close to O(1) as something that is not O(1) ever gets.</em>`,
          }
        : {
            es: `Hondura final: <b>${hondura}</b>, y se quedó ahí: la unión por tamaño sola ya garantiza log₂(${ELEMENTOS.length}) = ${Math.log2(ELEMENTOS.length)}. Se caminaron <b>${caminados}</b> saltos en total. <em>Ahora activá la compresión de caminos y mirá el árbol aplanarse en el paso del <code>buscar</code>.</em>`,
            en: `Final depth: <b>${hondura}</b>, and it stayed there: union by size alone already guarantees log₂(${ELEMENTOS.length}) = ${Math.log2(ELEMENTOS.length)}. <b>${caminados}</b> hops were walked in total. <em>Now turn path compression on and watch the tree flatten at the <code>find</code> step.</em>`,
          },
  });

  return pasos;
}
