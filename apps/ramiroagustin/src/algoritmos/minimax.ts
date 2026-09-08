import type { Frase } from "../i18n/idioma";
import type { EscenaJuego, ItemPanel, NodoJuego, PasoEscena } from "./escena";

/**
 * Minimax con poda alfa-beta, sobre un árbol de juego de dos niveles.
 *
 * Minimax es la idea de que el rival juega tan bien como uno: yo maximizo, él
 * minimiza, y así hasta el final de la partida. La poda es lo que la vuelve
 * usable, y su encanto es que <b>no es una aproximación</b>: descarta ramas
 * demostrando que no pueden cambiar la respuesta, así que devuelve exactamente
 * la misma jugada que mirarlo todo.
 *
 * Los tres escenarios son el mismo árbol con los mismos números. Lo único que
 * cambia es el orden en que se miran las jugadas, y esa es la demostración:
 * la poda ahorra entre todo y nada según lo bien ordenado que esté el árbol.
 */

/** Cada terna son las tres respuestas del rival a una jugada mía. */
const RAMAS: number[][] = [
  [8, 9, 10],
  [2, 7, 6],
  [5, 3, 9],
];

const ORDEN_MALO = [1, 2, 0]; // primero la peor jugada: la poda se queda sin nada que cortar

type Estado = "normal" | "activo" | "cerrado" | "descartado" | "destacado";

export function correrMinimax(escenario: string): PasoEscena[] {
  const podar = escenario !== "sinpoda";
  const orden = escenario === "malorden" ? ORDEN_MALO : [0, 1, 2];
  const ramas = orden.map((i) => RAMAS[i]!);

  const valor = new Map<string, number>();
  const ventana = new Map<string, string>();
  const estado = new Map<string, Estado>();
  const podados = new Set<string>();
  let hojasVistas = 0;

  const idRama = (r: number) => `m${r}`;
  const idHoja = (r: number, h: number) => `h${r}${h}`;

  const inf = (n: number) => (n === Infinity ? "∞" : n === -Infinity ? "−∞" : String(n));

  const escena = (): EscenaJuego => {
    const nodos: NodoJuego[] = [
      {
        id: "raiz",
        x: 50,
        y: 12,
        turno: "max",
        etiqueta: valor.has("raiz") ? String(valor.get("raiz")) : "?",
        ventana: ventana.get("raiz"),
        estado: estado.get("raiz") ?? "normal",
      },
    ];

    const aristas: EscenaJuego["aristas"] = [];
    const centros = [18, 50, 82];

    ramas.forEach((hojas, r) => {
      const id = idRama(r);
      nodos.push({
        id,
        x: centros[r]!,
        y: 47,
        turno: "min",
        etiqueta: valor.has(id) ? String(valor.get(id)) : "?",
        ventana: ventana.get(id),
        estado: estado.get(id) ?? "normal",
      });
      aristas.push({
        a: "raiz",
        b: id,
        estado: podados.has(id) ? "apagada" : valor.has(id) ? "arbol" : "normal",
      });

      hojas.forEach((v, h) => {
        const hid = idHoja(r, h);
        nodos.push({
          id: hid,
          x: centros[r]! + (h - 1) * 11.5,
          y: 84,
          turno: "hoja",
          etiqueta: String(v),
          estado: estado.get(hid) ?? "normal",
        });
        aristas.push({
          a: id,
          b: hid,
          estado: podados.has(hid)
            ? "apagada"
            : estado.get(hid) === "cerrado"
              ? "arbol"
              : "normal",
        });
      });
    });

    return { tipo: "juego", nodos, aristas };
  };

  const panel = (): ItemPanel[] => [
    {
      clave: { es: "hojas miradas", en: "leaves looked at" },
      texto: {
        es: `${hojasVistas} de ${ramas.flat().length}`,
        en: `${hojasVistas} of ${ramas.flat().length}`,
      },
      nota: podados.size
        ? {
            es: `${[...podados].filter((p) => p.startsWith("h")).length} podadas`,
            en: `${[...podados].filter((p) => p.startsWith("h")).length} pruned`,
          }
        : undefined,
      destacado: true,
    },
    ...ramas.map((_, r) => ({
      clave: { es: `jugada ${orden[r]! + 1}`, en: `move ${orden[r]! + 1}` },
      texto: valor.has(idRama(r))
        ? { es: `vale ${valor.get(idRama(r))}`, en: `worth ${valor.get(idRama(r))}` }
        : { es: "sin evaluar", en: "not evaluated" },
      nota: ventana.get(idRama(r)),
    })),
  ];

  const pasos: PasoEscena[] = [];
  const paso = (linea: number, texto: Frase) =>
    pasos.push({ linea, texto, escena: escena(), panel: panel() });

  // ── Recorrido ──────────────────────────────────────────────────────────
  ventana.set("raiz", `α=−∞ β=∞`);
  estado.set("raiz", "activo");
  paso(1, {
    es: `Un árbol de jugadas. Arriba juego yo y <b>elijo el máximo</b>; abajo responde el rival y <b>elige el mínimo</b>. Los números de abajo son lo que vale la partida si se llega ahí. ${
      podar
        ? "Y llevo dos números conmigo: <code>α</code>, lo mejor que ya me aseguré, y <code>β</code>, lo mejor que se aseguró el rival."
        : "Sin poda: voy a mirar las nueve hojas, uno por uno, sin excepción."
    }`,
    en: `A tree of moves. Up top I play and <b>pick the maximum</b>; below the opponent answers and <b>picks the minimum</b>. The numbers at the bottom are what the game is worth if play reaches them. ${
      podar
        ? "And I carry two numbers with me: <code>α</code>, the best I have already secured, and <code>β</code>, the best the opponent has secured."
        : "No pruning: I am going to look at all nine leaves, one by one, without exception."
    }`,
  });

  let alfa = -Infinity;
  let mejorRaiz = -Infinity;
  estado.set("raiz", "normal");

  for (let r = 0; r < ramas.length; r++) {
    const id = idRama(r);
    const hojas = ramas[r]!;
    let beta = Infinity;
    estado.set(id, "activo");
    ventana.set(id, `α=${inf(alfa)} β=${inf(beta)}`);

    paso(15, {
      es: `Bajo por mi jugada <b>${orden[r]! + 1}</b>. Acá contesta el rival, así que de estas tres hojas se va a quedar con <b>la más chica</b>. Entro con <code>α=${inf(alfa)}</code>.`,
      en: `I go down my move <b>${orden[r]! + 1}</b>. The opponent answers here, so out of these three leaves they will keep <b>the smallest one</b>. I enter with <code>α=${inf(alfa)}</code>.`,
    });

    let cortada = false;

    for (let h = 0; h < hojas.length; h++) {
      const hid = idHoja(r, h);
      const v = hojas[h]!;

      if (cortada) {
        podados.add(hid);
        estado.set(hid, "descartado");
        continue;
      }

      estado.set(hid, "activo");
      hojasVistas++;
      paso(16, {
        es: `Evalúo la hoja <b>${v}</b>. <em>Mirarla es el trabajo caro</em>: en un juego de verdad, cada hoja es una posición que hay que puntuar.`,
        en: `I evaluate leaf <b>${v}</b>. <em>Looking at it is the expensive part</em>: in a real game, every leaf is a position that has to be scored.`,
      });
      estado.set(hid, "cerrado");

      beta = Math.min(beta, v);
      valor.set(id, beta);
      ventana.set(id, `α=${inf(alfa)} β=${inf(beta)}`);

      paso(17, {
        es: `El rival ya tiene una respuesta que me deja en <b>${beta}</b>, así que esta jugada no me va a dar más que eso. <code>β = ${inf(beta)}</code>.`,
        en: `The opponent already has an answer that leaves me at <b>${beta}</b>, so this move will not give me more than that. <code>β = ${inf(beta)}</code>.`,
      });

      if (podar && beta <= alfa && h < hojas.length - 1) {
        cortada = true;
        for (let k = h + 1; k < hojas.length; k++) {
          podados.add(idHoja(r, k));
          estado.set(idHoja(r, k), "descartado");
        }
        paso(18, {
          es: `<b>Corto acá.</b> Ya me aseguré <code>${inf(alfa)}</code> por otro lado, y esta jugada no puede darme más de <code>${inf(beta)}</code>. <em>Las ${hojas.length - h - 1} hojas que quedan no pueden cambiar mi decisión: mirarlas sería trabajo desperdiciado, y no las miro.</em>`,
          en: `<b>I cut here.</b> I already secured <code>${inf(alfa)}</code> elsewhere, and this move cannot give me more than <code>${inf(beta)}</code>. <em>The ${hojas.length - h - 1} remaining leaves cannot change my decision: looking at them would be wasted work, so I do not.</em>`,
        });
      }
    }

    const resultado = valor.get(id)!;
    estado.set(id, "cerrado");

    if (resultado > mejorRaiz) {
      mejorRaiz = resultado;
      valor.set("raiz", mejorRaiz);
      alfa = Math.max(alfa, mejorRaiz);
      ventana.set("raiz", `α=${inf(alfa)} β=∞`);
      paso(8, {
        es: `La jugada ${orden[r]! + 1} vale <b>${resultado}</b>, mejor que todo lo anterior. Es mi nueva favorita, y <code>α</code> sube a <b>${inf(alfa)}</b>: eso es lo que ya tengo garantizado pase lo que pase.`,
        en: `Move ${orden[r]! + 1} is worth <b>${resultado}</b>, better than anything before it. It is my new favourite, and <code>α</code> rises to <b>${inf(alfa)}</b>: that is what I have guaranteed no matter what happens.`,
      });
    } else {
      valor.set("raiz", mejorRaiz);
      paso(7, {
        es: `La jugada ${orden[r]! + 1} vale <b>${resultado}</b>, que no le gana a los <b>${mejorRaiz}</b> que ya tenía. La descarto.`,
        en: `Move ${orden[r]! + 1} is worth <b>${resultado}</b>, which does not beat the <b>${mejorRaiz}</b> I already had. I drop it.`,
      });
    }
  }

  estado.set("raiz", "destacado");

  // ── Cierre ─────────────────────────────────────────────────────────────
  const total = ramas.flat().length;
  const ahorro = Math.round((1 - hojasVistas / total) * 100);
  const elegida =
    orden[ramas.findIndex((_, r) => valor.get(idRama(r)) === mejorRaiz)]! + 1;

  pasos.push({
    linea: 0,
    texto: {
      es: `Mi jugada es la <b>${elegida}</b>, y vale <b>${mejorRaiz}</b>.`,
      en: `My move is number <b>${elegida}</b>, and it is worth <b>${mejorRaiz}</b>.`,
    },
    escena: escena(),
    panel: panel(),
    veredicto: !podar
      ? {
          es: `<b>${hojasVistas}</b> hojas de ${total}: todas. El resultado es <b>${mejorRaiz}</b>, jugada ${elegida}. <em>Guardate ese número y activá la poda: tiene que dar exactamente lo mismo.</em> Si diera distinto, la poda estaría rota — no es una aproximación ni una heurística.`,
          en: `<b>${hojasVistas}</b> leaves out of ${total}: all of them. The result is <b>${mejorRaiz}</b>, move ${elegida}. <em>Hold on to that number and turn pruning on: it has to come out exactly the same.</em> If it came out different, the pruning would be broken — it is not an approximation nor a heuristic.`,
        }
      : hojasVistas === total
        ? {
            es: `<b>${hojasVistas}</b> hojas de ${total}: la poda estaba activada y no cortó <b>ni una sola rama</b>. Mismo resultado, <b>${mejorRaiz}</b>, y cero ahorro. <em>Alfa-beta solo puede podar cuando ya encontró algo bueno, y acá miró primero la peor jugada.</em> Por eso un motor de ajedrez gasta tiempo en ordenar las jugadas antes de buscarlas: con el orden perfecto, alfa-beta llega al <b>doble de profundidad</b> en el mismo tiempo; con el peor, no gana nada.`,
            en: `<b>${hojasVistas}</b> leaves out of ${total}: pruning was on and it cut <b>not one single branch</b>. Same result, <b>${mejorRaiz}</b>, and zero savings. <em>Alpha-beta can only prune once it has found something good, and here it looked at the worst move first.</em> That is why a chess engine spends time ordering moves before searching them: with perfect ordering, alpha-beta reaches <b>twice the depth</b> in the same time; with the worst, it gains nothing.`,
          }
        : {
            es: `<b>${hojasVistas}</b> hojas de ${total}, un <b>${ahorro}%</b> menos de trabajo — y la misma respuesta que mirándolas todas: jugada ${elegida}, vale ${mejorRaiz}. <em>La poda no adivina: demuestra que lo que no miró no podía cambiar la decisión.</em> Probá «Sin poda» para confirmar el número, y «Mal ordenado» para ver de qué depende el ahorro.`,
            en: `<b>${hojasVistas}</b> leaves out of ${total}, <b>${ahorro}%</b> less work — and the same answer as looking at every one: move ${elegida}, worth ${mejorRaiz}. <em>Pruning does not guess: it proves that what it skipped could not have changed the decision.</em> Try «No pruning» to confirm the number, and «Badly ordered» to see what the savings depend on.`,
          },
  });

  return pasos;
}
