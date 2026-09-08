import type { Frase } from "../i18n/idioma";
import type {
  CurvaPlano,
  EscenaPlano,
  ItemPanel,
  PasoEscena,
  PuntoPlano,
} from "./escena";

/**
 * Descenso de gradiente: cómo aprende, literalmente, una red neuronal.
 *
 * La curva es el error del modelo en función de un parámetro, y la bolita es
 * el valor actual de ese parámetro. Entrenar es esto y nada más: mirar cuánto
 * baja el suelo bajo los pies y dar un paso en contra de la pendiente.
 *
 * Lo que la animación deja ver, y ningún texto explica igual de bien, son las
 * dos cosas que salen mal en la práctica: que la bolita se meta en un pozo que
 * no es el más hondo, y que con el paso demasiado grande no aprenda nada — se
 * va a cualquier lado. En un modelo de verdad el eje horizontal tiene millones
 * de dimensiones y nadie puede dibujar la curva; el algoritmo es el mismo.
 */

const X0 = -6;
const X1 = 5;
const Y_TOPE = 10;

const f = (x: number) => 0.02 * x ** 4 + 0.06 * x ** 3 - 0.5 * x ** 2 - 0.6 * x + 5;
const df = (x: number) => 0.08 * x ** 3 + 0.18 * x ** 2 - x - 0.6;

const px = (x: number) => ((x - X0) / (X1 - X0)) * 100;
const py = (y: number) => Math.max(0, Math.min(100, (y / Y_TOPE) * 100));

/** La curva se muestrea una sola vez: no cambia nunca. */
const CURVA: CurvaPlano = {
  puntos: Array.from({ length: 121 }, (_, i) => {
    const x = X0 + ((X1 - X0) * i) / 120;
    return { x: px(x), y: py(f(x)) };
  }),
};

type Ajustes = { inicio: number; paso: number };

const AJUSTES: Record<string, Ajustes> = {
  justo: { inicio: -1.5, paso: 0.4 },
  local: { inicio: 0.5, paso: 0.4 },
  grande: { inicio: -1.5, paso: 2.4 },
};

const num = (n: number) => (Math.abs(n) >= 1000 ? n.toExponential(1) : n.toFixed(2));

export function correrGradiente(escenario: string): PasoEscena[] {
  const { inicio, paso: tasa } = AJUSTES[escenario] ?? AJUSTES.justo!;

  let x = inicio;
  const rastro: number[] = [];
  let pendiente = df(x);
  let iter = 0;
  let final: "convergio" | "divergio" | "corte" = "corte";

  const pasos: PasoEscena[] = [];

  const escena = (conTangente: boolean): EscenaPlano => {
    const curvas: CurvaPlano[] = [CURVA];

    if (conTangente && Math.abs(x) <= X1 + 1 && x >= X0 - 1) {
      // La pendiente dibujada. Es lo único que el algoritmo llega a ver del
      // paisaje: un tramo recto bajo los pies, no la curva entera.
      const dx = 1.1;
      curvas.push({
        puntos: [
          { x: px(x - dx), y: py(f(x) - pendiente * dx) },
          { x: px(x + dx), y: py(f(x) + pendiente * dx) },
        ],
        grupo: 1,
        punteada: true,
      });
    }

    const puntos: PuntoPlano[] = rastro
      .filter((v) => v >= X0 && v <= X1)
      .map((v) => ({
        x: px(v),
        y: py(f(v)),
        forma: "punto" as const,
        estado: "descartado" as const,
      }));

    if (x >= X0 && x <= X1) {
      puntos.push({ x: px(x), y: py(f(x)), forma: "bolita", grupo: 1, nombre: num(x) });
    }

    return {
      tipo: "plano",
      curvas,
      puntos,
      ejes: {
        x: { es: "el parámetro que se ajusta", en: "the parameter being tuned" },
        y: { es: "error", en: "error" },
      },
    };
  };

  const panel = (): ItemPanel[] => [
    {
      clave: { es: "paso de aprendizaje", en: "learning rate" },
      texto: String(tasa),
      nota: { es: "fijo durante toda la corrida", en: "fixed for the whole run" },
      destacado: true,
    },
    { clave: { es: "iteración", en: "iteration" }, texto: String(iter) },
    { clave: "x", texto: num(x) },
    {
      clave: { es: "error f(x)", en: "error f(x)" },
      texto: Math.abs(x) > 40 ? { es: "enorme", en: "enormous" } : num(f(x)),
    },
    {
      clave: { es: "pendiente f′(x)", en: "slope f′(x)" },
      texto: num(pendiente),
      nota:
        Math.abs(pendiente) < 0.01
          ? { es: "suelo plano", en: "flat ground" }
          : pendiente > 0
            ? { es: "baja hacia la izquierda", en: "downhill to the left" }
            : { es: "baja hacia la derecha", en: "downhill to the right" },
    },
  ];

  const emitir = (linea: number, texto: Frase, tangente = true) =>
    pasos.push({ linea, texto, escena: escena(tangente), panel: panel() });

  emitir(1, {
    es: `La bolita arranca en <code>x = ${num(x)}</code>, con un error de <code>${num(f(x))}</code>. <b>El algoritmo no ve esta curva.</b> Solo puede preguntar dos cosas en el punto donde está parado: cuánto vale el error, y hacia dónde baja el suelo.`,
    en: `The ball starts at <code>x = ${num(x)}</code>, with an error of <code>${num(f(x))}</code>. <b>The algorithm cannot see this curve.</b> It can only ask two things at the point where it stands: what the error is, and which way the ground slopes down.`,
  });

  while (iter < 60) {
    pendiente = df(x);

    emitir(5, {
      es: `La pendiente acá es <code>${num(pendiente)}</code>. ${
        pendiente > 0
          ? "Positiva: el terreno sube hacia la derecha, así que lo que conviene es ir <b>a la izquierda</b>."
          : "Negativa: el terreno baja hacia la derecha, así que hay que ir <b>a la derecha</b>."
      }`,
      en: `The slope here is <code>${num(pendiente)}</code>. ${
        pendiente > 0
          ? "Positive: the ground rises to the right, so the move is to go <b>left</b>."
          : "Negative: the ground falls to the right, so the move is to go <b>right</b>."
      }`,
    });

    if (Math.abs(pendiente) < 0.01) {
      final = "convergio";
      break;
    }

    rastro.push(x);
    const anterior = x;
    x = x - tasa * pendiente;
    iter++;

    emitir(
      8,
      {
        es: `Doy el paso: <code>x = ${num(anterior)} − ${tasa} × ${num(pendiente)} = ${num(x)}</code>. ${
          Math.abs(x) > 40
            ? "<b>Y me fui de la escala.</b>"
            : f(x) > f(anterior)
              ? `El error <b>subió</b>, de ${num(f(anterior))} a ${num(f(x))}: el paso fue tan largo que crucé el valle y salí por el otro lado, más arriba.`
              : `El error baja de ${num(f(anterior))} a ${num(f(x))}.`
        }`,
        en: `I take the step: <code>x = ${num(anterior)} − ${tasa} × ${num(pendiente)} = ${num(x)}</code>. ${
          Math.abs(x) > 40
            ? "<b>And I have shot off the scale.</b>"
            : f(x) > f(anterior)
              ? `The error <b>went up</b>, from ${num(f(anterior))} to ${num(f(x))}: the step was so long that I crossed the valley and came out the far side, higher than before.`
              : `The error drops from ${num(f(anterior))} to ${num(f(x))}.`
        }`,
      },
      Math.abs(x) <= 40,
    );

    if (Math.abs(x) > 40) {
      final = "divergio";
      break;
    }
  }

  // ── Cierre ─────────────────────────────────────────────────────────────
  const global = -4.605;
  const enGlobal = Math.abs(x - global) < 0.5;

  pasos.push({
    linea: final === "convergio" ? 10 : 0,
    texto:
      final === "divergio"
        ? { es: `La bolita se fue de la pantalla.`, en: `The ball flew off the screen.` }
        : final === "convergio"
          ? {
              es: `El suelo se puso plano: la pendiente es prácticamente cero y el paso ya no mueve nada.`,
              en: `The ground went flat: the slope is practically zero and the step no longer moves anything.`,
            }
          : { es: `Se acabaron las iteraciones.`, en: `The iterations ran out.` },
    escena: escena(false),
    panel: panel(),
    veredicto:
      final === "divergio"
        ? {
            es: `Con un paso de <b>${tasa}</b> el algoritmo <b>no aprendió nada</b>: cada salto lo dejó en una pendiente más empinada que la anterior, y en ${iter} iteraciones se fue al infinito. <em>El mismo algoritmo, la misma curva, la misma bolita.</em> Lo único que cambió es un número que nadie deduce de la teoría — por eso ajustar el learning rate es la mitad del trabajo de entrenar un modelo, y por eso un entrenamiento que devuelve <code>NaN</code> casi siempre es esto.`,
            en: `With a step of <b>${tasa}</b> the algorithm <b>learned nothing</b>: every jump landed it on a steeper slope than the last, and in ${iter} iterations it ran off to infinity. <em>Same algorithm, same curve, same ball.</em> The only thing that changed is a number nobody derives from theory — which is why tuning the learning rate is half the work of training a model, and why a training run that returns <code>NaN</code> is almost always this.`,
          }
        : enGlobal
          ? {
              es: `Convergió en <b>${iter}</b> iteraciones al fondo del valle: <code>x = ${num(x)}</code>, error <code>${num(f(x))}</code>. Es el mínimo más hondo que tiene esta curva. <em>Pero el algoritmo no lo sabe</em>: solo sabe que el suelo se puso plano. Probá «Del lado equivocado» y mirá cómo, cambiando únicamente dónde arranca, termina igual de convencido en otro pozo.`,
              en: `It converged in <b>${iter}</b> iterations to the bottom of the valley: <code>x = ${num(x)}</code>, error <code>${num(f(x))}</code>. It is the deepest minimum this curve has. <em>But the algorithm does not know that</em>: all it knows is that the ground went flat. Try «Starting on the wrong side» and watch how, changing nothing but where it begins, it ends up just as convinced in a different pit.`,
            }
          : {
              es: `Convergió en <b>${iter}</b> iteraciones a <code>x = ${num(x)}</code>, con error <code>${num(f(x))}</code>. Se paró, el suelo está plano, no hay nada de qué quejarse — <b>y no es el mínimo</b>: a la izquierda hay un valle más hondo, con error <code>${num(f(global))}</code>, que nunca vio. <em>Para llegar ahí habría que subir primero, y este algoritmo jamás sube.</em> Cambió el punto de partida y nada más; ese es todo el motivo por el que dos entrenamientos idénticos dan modelos distintos.`,
              en: `It converged in <b>${iter}</b> iterations to <code>x = ${num(x)}</code>, with error <code>${num(f(x))}</code>. It stopped, the ground is flat, there is nothing to complain about — <b>and it is not the minimum</b>: to the left there is a deeper valley, with error <code>${num(f(global))}</code>, that it never saw. <em>Getting there would mean climbing first, and this algorithm never climbs.</em> Only the starting point changed; that alone is why two identical training runs produce different models.`,
            },
  });

  return pasos;
}
