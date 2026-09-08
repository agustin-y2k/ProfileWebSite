import type { Frase } from "../i18n/idioma";
import type { EscenaPlano, ItemPanel, PasoEscena, PuntoPlano } from "./escena";

/**
 * k-means: agrupar sin que nadie diga qué es cada grupo.
 *
 * Es el ejemplo más corto de aprendizaje no supervisado —no hay respuestas
 * correctas en ninguna parte, solo puntos— y también el más honesto sobre sus
 * límites. El algoritmo siempre termina y siempre devuelve k grupos. Que sean
 * los grupos que hay es otra cosa: depende de dónde arrancaron los centros y
 * de que k haya sido el número correcto, y de ninguna de las dos el algoritmo
 * sabe nada.
 */

/** PRNG propio para que la nube de puntos sea la misma en cada visita. */
function semilla(s: number) {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Punto = { x: number; y: number };

const NUBES: { cx: number; cy: number; n: number; radio: number }[] = [
  { cx: 26, cy: 72, n: 14, radio: 11 },
  { cx: 72, cy: 78, n: 13, radio: 10 },
  { cx: 52, cy: 24, n: 13, radio: 12 },
];

const PUNTOS: Punto[] = (() => {
  const azar = semilla(20260908);
  const lista: Punto[] = [];
  for (const nube of NUBES) {
    for (let i = 0; i < nube.n; i++) {
      const ang = azar() * Math.PI * 2;
      const r = Math.sqrt(azar()) * nube.radio;
      lista.push({ x: nube.cx + Math.cos(ang) * r, y: nube.cy + Math.sin(ang) * r });
    }
  }
  return lista;
})();

const ARRANQUES: Record<string, Punto[]> = {
  // Lejos de todo y repartidos: el caso amable.
  natural: [
    { x: 12, y: 12 },
    { x: 50, y: 55 },
    { x: 90, y: 90 },
  ],
  // Dos centros dentro de la misma nube. Nada ilegal: es lo que puede tocar
  // cuando los centros iniciales se sortean.
  malarranque: [
    { x: 22, y: 68 },
    { x: 29, y: 75 },
    { x: 62, y: 48 },
  ],
  // Dos grupos para tres nubes.
  kdos: [
    { x: 20, y: 25 },
    { x: 80, y: 80 },
  ],
};

const dist2 = (a: Punto, b: Punto) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

export function correrKMeans(escenario: string): PasoEscena[] {
  const centros = (ARRANQUES[escenario] ?? ARRANQUES.natural!).map((c) => ({ ...c }));
  const k = centros.length;
  const grupo = new Array<number>(PUNTOS.length).fill(-1);

  let iter = 0;
  let mirando = -1;

  const pasos: PasoEscena[] = [];

  const escena = (): EscenaPlano => {
    const puntos: PuntoPlano[] = PUNTOS.map((p, i) => ({
      x: p.x,
      y: p.y,
      grupo: grupo[i] === -1 ? undefined : grupo[i],
      forma: "punto",
      estado: i === mirando ? "activo" : undefined,
    }));

    centros.forEach((c, g) => {
      puntos.push({ x: c.x, y: c.y, grupo: g, forma: "centro", nombre: `c${g + 1}` });
    });

    return { tipo: "plano", curvas: [], puntos, ejes: { x: "", y: "" } };
  };

  const inercia = () =>
    PUNTOS.reduce(
      (t, p, i) => (grupo[i] === -1 ? t : t + dist2(p, centros[grupo[i]!]!)),
      0,
    );

  const panel = (): ItemPanel[] => [
    {
      clave: { es: "iteración", en: "iteration" },
      texto: String(iter),
      destacado: true,
    },
    ...centros.map((c, g) => {
      const cuantos = grupo.filter((x) => x === g).length;
      return {
        clave: { es: `grupo ${g + 1}`, en: `cluster ${g + 1}` },
        texto: {
          es: `${cuantos} ${cuantos === 1 ? "punto" : "puntos"}`,
          en: `${cuantos} ${cuantos === 1 ? "point" : "points"}`,
        },
        nota: {
          es: `centro en ${c.x.toFixed(0)}, ${c.y.toFixed(0)}`,
          en: `centre at ${c.x.toFixed(0)}, ${c.y.toFixed(0)}`,
        },
      };
    }),
    {
      clave: { es: "dispersión", en: "spread" },
      texto: grupo.includes(-1) ? "—" : inercia().toFixed(0),
    },
  ];

  const paso = (linea: number, texto: Frase) =>
    pasos.push({ linea, texto, escena: escena(), panel: panel() });

  paso(2, {
    es: `${PUNTOS.length} puntos y <b>${k} centros</b> puestos donde sea. Nadie etiquetó nada: el algoritmo no sabe que hay nubes, ni cuántas, ni dónde. ${
      escenario === "kdos"
        ? "Le pedí <b>dos</b> grupos, y dos es lo que va a darme."
        : escenario === "malarranque"
          ? "Fijate dónde cayeron dos de los tres centros: <b>en la misma nube</b>."
          : "Lo único que le di es el número 3."
    }`,
    en: `${PUNTOS.length} points and <b>${k} centres</b> dropped anywhere. Nobody labelled anything: the algorithm does not know there are clouds, nor how many, nor where. ${
      escenario === "kdos"
        ? "I asked it for <b>two</b> clusters, and two is what it will give me."
        : escenario === "malarranque"
          ? "Look where two of the three centres landed: <b>inside the same cloud</b>."
          : "The only thing I gave it is the number 3."
    }`,
  });

  // ── Lloyd ──────────────────────────────────────────────────────────────
  let movio = true;

  while (movio && iter < 30) {
    iter++;

    // La primera vuelta se muestra punto por punto: es donde se entiende que
    // «pertenecer a un grupo» no es más que estar cerca de un centro.
    if (iter === 1) {
      for (let i = 0; i < 5; i++) {
        mirando = i;
        const p = PUNTOS[i]!;
        const distancias = centros.map((c) => Math.sqrt(dist2(p, c)));
        const mejor = distancias.indexOf(Math.min(...distancias));
        grupo[i] = mejor;
        paso(7, {
          es: `Este punto mide su distancia a los ${k} centros —<code>${distancias.map((d) => d.toFixed(0)).join("</code>, <code>")}</code>— y se anota en el <b>grupo ${mejor + 1}</b>, el del centro más cercano. Toda la pertenencia a un grupo es eso.`,
          en: `This point measures its distance to the ${k} centres —<code>${distancias.map((d) => d.toFixed(0)).join("</code>, <code>")}</code>— and signs up to <b>cluster ${mejor + 1}</b>, the nearest centre's. Belonging to a cluster is nothing more than that.`,
        });
      }
      mirando = -1;
    }

    for (let i = 0; i < PUNTOS.length; i++) {
      const p = PUNTOS[i]!;
      let mejor = 0;
      let md = Infinity;
      for (let g = 0; g < k; g++) {
        const d = dist2(p, centros[g]!);
        if (d < md) {
          md = d;
          mejor = g;
        }
      }
      grupo[i] = mejor;
    }

    paso(
      7,
      iter === 1
        ? {
            es: `Y lo mismo con los ${PUNTOS.length - 5} que faltan. Todos los puntos tienen grupo, aunque los centros todavía estén en cualquier parte.`,
            en: `And the same for the remaining ${PUNTOS.length - 5}. Every point has a cluster now, even though the centres are still wherever they happened to land.`,
          }
        : {
            es: `<b>Vuelta ${iter}.</b> Cada punto vuelve a elegir el centro más cercano. Algunos cambian de grupo, y esos son los que van a mover los centros.`,
            en: `<b>Pass ${iter}.</b> Every point picks its nearest centre again. Some switch clusters, and those are the ones that will move the centres.`,
          },
    );

    // ── Mudanza ──────────────────────────────────────────────────────────
    movio = false;
    let mayor = 0;
    for (let g = 0; g < k; g++) {
      const mios = PUNTOS.filter((_, i) => grupo[i] === g);
      if (!mios.length) continue;
      const nx = mios.reduce((t, p) => t + p.x, 0) / mios.length;
      const ny = mios.reduce((t, p) => t + p.y, 0) / mios.length;
      const d = Math.hypot(nx - centros[g]!.x, ny - centros[g]!.y);
      mayor = Math.max(mayor, d);
      if (d > 0.4) movio = true;
      centros[g] = { x: nx, y: ny };
    }

    paso(
      11,
      movio
        ? {
            es: `Ahora cada centro se muda al <b>promedio de los suyos</b>. El que más se movió lo hizo <code>${mayor.toFixed(1)}</code>. <em>Y al mudarse, deja de ser el más cercano para algunos puntos</em> — por eso hay que volver a repartir.`,
            en: `Now every centre moves to the <b>average of its own points</b>. The one that moved most went <code>${mayor.toFixed(1)}</code>. <em>And by moving, it stops being the nearest centre for some points</em> — which is why everything has to be reassigned.`,
          }
        : {
            es: `Los centros ya no se mueven: cada uno está exactamente en el promedio de sus puntos, y cada punto está en el grupo de su centro más cercano. <b>Terminó.</b>`,
            en: `The centres have stopped moving: each one sits exactly at the average of its points, and each point is in its nearest centre's cluster. <b>Done.</b>`,
          },
    );
  }

  // ── Cierre ─────────────────────────────────────────────────────────────
  const tamanos = centros.map((_, g) => grupo.filter((x) => x === g).length);

  pasos.push({
    linea: 14,
    texto: {
      es: `Estable en ${iter} vueltas.`,
      en: `Stable after ${iter} passes.`,
    },
    escena: escena(),
    panel: panel(),
    veredicto:
      escenario === "kdos"
        ? {
            es: `Le pedí <b>2</b> grupos y me dio 2, de ${tamanos.join(" y ")} puntos, partiendo por el medio algo que a simple vista son <b>tres nubes</b>. No hay error ni advertencia: <em>k-means nunca contesta «k está mal»</em>, porque no tiene forma de saber cuántos grupos hay. Elegir k es del que lo usa, y por eso existen el método del codo y el coeficiente de silueta.`,
            en: `I asked for <b>2</b> clusters and it gave me 2, of ${tamanos.join(" and ")} points, splitting down the middle something that plainly looks like <b>three clouds</b>. There is no error and no warning: <em>k-means never answers «k is wrong»</em>, because it has no way of knowing how many clusters there are. Choosing k belongs to whoever runs it, and that is why the elbow method and the silhouette coefficient exist.`,
          }
        : escenario === "malarranque"
          ? {
              es: `Convergió en <b>${iter}</b> vueltas, prolijo y estable, a grupos de ${tamanos.join(", ")} puntos — y <b>partió una nube al medio mientras metía las otras dos en una sola bolsa</b>. Dispersión final: <code>${inercia().toFixed(0)}</code>, bastante peor que la del otro arranque. <em>Mismos puntos, mismo algoritmo, otro resultado</em>: lo único que cambió fue dónde cayeron los centros al principio. Por eso k-means se corre varias veces y se elige la mejor, y por eso existe k-means++, que sortea los centros iniciales lejos entre sí.`,
              en: `It converged in <b>${iter}</b> passes, tidy and stable, to clusters of ${tamanos.join(", ")} points — and <b>split one cloud down the middle while stuffing the other two into a single bag</b>. Final spread: <code>${inercia().toFixed(0)}</code>, considerably worse than the other start's. <em>Same points, same algorithm, different answer</em>: the only thing that changed was where the centres happened to land at the beginning. That is why k-means is run several times and the best run kept, and why k-means++ exists, drawing the initial centres far apart from each other.`,
            }
          : {
              es: `Convergió en <b>${iter}</b> vueltas a grupos de ${tamanos.join(", ")} puntos, que son justo las nubes que se ven. Dispersión: <code>${inercia().toFixed(0)}</code>. <em>Y no lo hizo porque las «reconociera»</em>: lo hizo porque repetir «cada punto a su centro más cercano, cada centro al promedio de los suyos» no puede dejar de bajar la dispersión, así que en algún momento se queda quieto. Probá «Arranque desafortunado» para ver lo mismo terminar mal.`,
              en: `It converged in <b>${iter}</b> passes to clusters of ${tamanos.join(", ")} points, which are exactly the clouds you can see. Spread: <code>${inercia().toFixed(0)}</code>. <em>And it did not do it because it «recognised» them</em>: it did it because repeating «every point to its nearest centre, every centre to the average of its own» cannot stop lowering the spread, so sooner or later it sits still. Try «An unlucky start» to watch the same thing end badly.`,
            },
  });

  return pasos;
}
