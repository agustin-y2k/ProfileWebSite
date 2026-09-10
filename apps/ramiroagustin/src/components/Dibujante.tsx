import { useEffect, useRef } from "react";
import type {
  Escena,
  EscenaArreglo,
  EscenaGrafo,
  EscenaJuego,
  EscenaPlano,
} from "../algoritmos/escena";
import { useIdioma } from "../i18n/contexto";
import styles from "./Dibujante.module.css";

/**
 * Los cuatro dibujantes, y el despacho que elige uno.
 *
 * Están juntos en un archivo porque comparten lo único que importa que
 * compartan: la escala de colores de estado y la de grupos. Separarlos en
 * cuatro archivos y un módulo de tokens sería más carpetas para la misma
 * cantidad de código.
 *
 * Ninguno sabe qué algoritmo lo llenó, y ese es el punto: agregar un algoritmo
 * que dibuje un grafo no toca esta pieza. Los que sí la tocaron —cada
 * dibujante nuevo— destrabaron varios algoritmos de una.
 */

/** Los grafos se dibujan anchos: 100 de ancho por 62 de alto. */
const APLASTAR = 0.62;

export function Dibujante({ escena, etiqueta }: { escena: Escena; etiqueta: string }) {
  switch (escena.tipo) {
    case "grafo":
      return <Grafo escena={escena} etiqueta={etiqueta} />;
    case "plano":
      return <Plano escena={escena} etiqueta={etiqueta} />;
    case "arreglo":
      return <Arreglo escena={escena} etiqueta={etiqueta} />;
    case "juego":
      return <Juego escena={escena} etiqueta={etiqueta} />;
  }
}

// ── Grafo ──────────────────────────────────────────────────────────────────
function Grafo({ escena, etiqueta }: { escena: EscenaGrafo; etiqueta: string }) {
  const { t } = useIdioma();
  const pos = new Map(escena.nodos.map((n) => [n.id, { x: n.x, y: n.y * APLASTAR }]));
  const R = 4.2;

  return (
    <svg
      className={styles.lienzo}
      viewBox="-7 -4 114 72"
      role="img"
      aria-label={etiqueta}
      preserveAspectRatio="xMidYMid meet"
    >
      {escena.aristas.map((a, i) => {
        const p = pos.get(a.a);
        const q = pos.get(a.b);
        if (!p || !q) return null;

        // El trazo se acorta en los dos extremos para no meterse debajo de los
        // nodos: con flecha, la punta tiene que verse tocando el borde.
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const largo = Math.hypot(dx, dy) || 1;
        const ux = dx / largo;
        const uy = dy / largo;
        const desde = { x: p.x + ux * R, y: p.y + uy * R };
        const hasta = {
          x: q.x - ux * (R + (a.flecha ? 1.6 : 0)),
          y: q.y - uy * (R + (a.flecha ? 1.6 : 0)),
        };

        const curva = a.curva ?? 0;
        const mx = (desde.x + hasta.x) / 2 - uy * curva;
        const my = (desde.y + hasta.y) / 2 + ux * curva;
        const d = curva
          ? `M ${desde.x} ${desde.y} Q ${mx} ${my} ${hasta.x} ${hasta.y}`
          : `M ${desde.x} ${desde.y} L ${hasta.x} ${hasta.y}`;

        return (
          <g
            key={`${a.a}-${a.b}-${i}`}
            data-estado={a.estado ?? "normal"}
            className={styles.arista}
          >
            <path d={d} className={styles.trazo} />
            {a.flecha && <Punta x={hasta.x} y={hasta.y} ux={ux} uy={uy} />}
            {a.peso && (
              <text x={mx} y={my - 1.4} className={styles.peso}>
                {t(a.peso)}
              </text>
            )}
          </g>
        );
      })}

      {escena.nodos.map((n) => {
        const p = pos.get(n.id)!;
        const nombre = t(n.nombre);
        const adentro = nombre.length <= 2;
        return (
          <g key={n.id} data-estado={n.estado ?? "normal"} className={styles.nodo}>
            <circle cx={p.x} cy={p.y} r={R} className={styles.disco} />
            {adentro ? (
              <text x={p.x} y={p.y + 1.15} className={styles.dentro}>
                {nombre}
              </text>
            ) : (
              <text x={p.x} y={p.y + R + 3.4} className={styles.nombre}>
                {nombre}
              </text>
            )}
            {n.etiqueta && (
              <text x={p.x} y={p.y + R + (adentro ? 3.4 : 7)} className={styles.etiqueta}>
                {t(n.etiqueta)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Punta({ x, y, ux, uy }: { x: number; y: number; ux: number; uy: number }) {
  const l = 2.1;
  const a = 1.15;
  return (
    <polygon
      className={styles.flecha}
      points={`${x},${y} ${x - ux * l - uy * a},${y - uy * l + ux * a} ${x - ux * l + uy * a},${y - uy * l - ux * a}`}
    />
  );
}

// ── Plano ──────────────────────────────────────────────────────────────────
function Plano({ escena, etiqueta }: { escena: EscenaPlano; etiqueta: string }) {
  const { t } = useIdioma();
  // Arriba es más: en un plano cartesiano el eje y sube, y en el de la pantalla
  // baja. La vuelta se da acá y no en cada algoritmo.
  const Y = (y: number) => 100 - y;
  const conEjes = Boolean(escena.ejes?.x || escena.ejes?.y);

  return (
    <svg
      className={styles.lienzo}
      viewBox="-9 -7 118 118"
      role="img"
      aria-label={etiqueta}
      preserveAspectRatio="xMidYMid meet"
    >
      {conEjes && (
        <g className={styles.ejes}>
          <path d="M 0 0 L 0 100 L 100 100" />
          {escena.ejes?.x && (
            <text x={50} y={108} className={styles.ejeTexto}>
              {t(escena.ejes.x)}
            </text>
          )}
          {escena.ejes?.y && (
            <text x={-4} y={50} className={styles.ejeTexto} transform="rotate(-90 -4 50)">
              {t(escena.ejes.y)}
            </text>
          )}
        </g>
      )}

      {escena.curvas.map((c, i) => (
        <polyline
          key={i}
          className={styles.curva}
          data-grupo={c.grupo}
          data-tenue={c.tenue || undefined}
          data-punteada={c.punteada || undefined}
          points={c.puntos.map((p) => `${p.x},${Y(p.y)}`).join(" ")}
        />
      ))}

      {escena.puntos.map((p, i) => {
        const forma = p.forma ?? "punto";
        return (
          <g
            key={i}
            className={styles.marca}
            data-grupo={p.grupo}
            data-forma={forma}
            data-estado={p.estado ?? "normal"}
          >
            {forma === "nodo" ? (
              <rect x={p.x - 2.2} y={Y(p.y) - 2.2} width={4.4} height={4.4} rx={1} />
            ) : forma === "centro" ? (
              <>
                <circle cx={p.x} cy={Y(p.y)} r={4.4} className={styles.halo} />
                <path
                  d={`M ${p.x - 2.6} ${Y(p.y)} h 5.2 M ${p.x} ${Y(p.y) - 2.6} v 5.2`}
                  className={styles.cruz}
                />
              </>
            ) : (
              <circle cx={p.x} cy={Y(p.y)} r={forma === "bolita" ? 3.2 : 1.7} />
            )}
            {p.nombre && (
              <text x={p.x} y={Y(p.y) - 4.6} className={styles.etiqueta}>
                {t(p.nombre)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Arreglo ────────────────────────────────────────────────────────────────
function Arreglo({ escena, etiqueta }: { escena: EscenaArreglo; etiqueta: string }) {
  const { t } = useIdioma();
  const caja = useRef<HTMLDivElement>(null);
  const punteros = new Map<number, string[]>();
  for (const p of escena.punteros) {
    punteros.set(p.indice, [...(punteros.get(p.indice) ?? []), t(p.nombre)]);
  }

  /**
   * La celda que el algoritmo está mirando. En un arreglo de treinta y dos
   * valores no entra ni un tercio en la pantalla de un teléfono, y sin esto la
   * búsqueda binaria salta al índice 15 y después al 23 —o sea, fuera de la
   * vista— mientras en pantalla no se mueve nada. Se ven las siete primeras
   * celdas quietas y el veredicto contando pasos que nadie vio dar.
   *
   * En un monitor no hace nada: si el arreglo entra entero no hay adónde
   * desplazarse, y `scrollTo` sobre un contenedor sin sobrante es un no-op.
   */
  const foco = escena.celdas.findIndex(
    (c) => c.estado === "medio" || c.estado === "hallada",
  );

  useEffect(() => {
    const cont = caja.current;
    if (!cont || foco < 0) return;

    const col = cont.querySelectorAll<HTMLElement>("[data-columna]")[foco];
    if (!col) return;

    // Coordenada de la celda dentro del contenido, no de la página: offsetLeft
    // se mide contra el offsetParent, que acá no es el contenedor que scrollea.
    const marco = cont.getBoundingClientRect();
    const celda = col.getBoundingClientRect();
    const izquierda = celda.left - marco.left + cont.scrollLeft;
    const derecha = izquierda + celda.width;

    // Si ya se ve, no se toca. Recentrar en cada paso haría temblar el arreglo
    // entero cuando el rango es chico y el medio se mueve de a una celda.
    if (izquierda >= cont.scrollLeft && derecha <= cont.scrollLeft + cont.clientWidth) {
      return;
    }

    // Asignación directa, y sin `scroll-behavior: smooth` en el contenedor: el
    // desplazamiento suave se ignora en varios contextos y ahí no scrollea
    // nada, ni por scrollTo({behavior}) ni por asignación. Instantáneo llega
    // siempre — y para seguir un puntero que salta, además es lo que se quiere.
    cont.scrollLeft = Math.max(0, izquierda + celda.width / 2 - cont.clientWidth / 2);
  }, [foco]);

  return (
    <div className={styles.arreglo} role="img" aria-label={etiqueta} ref={caja}>
      <div className={styles.celdas}>
        {escena.celdas.map((c, i) => (
          <div key={i} className={styles.columna} data-columna={i}>
            <div className={styles.celdaArreglo} data-estado={c.estado ?? "rango"}>
              {c.valor}
            </div>
            <div className={styles.puntero}>{punteros.get(i)?.join(" ") ?? ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Árbol de juego ─────────────────────────────────────────────────────────
function Juego({ escena, etiqueta }: { escena: EscenaJuego; etiqueta: string }) {
  const { t } = useIdioma();
  const pos = new Map(escena.nodos.map((n) => [n.id, { x: n.x, y: n.y * APLASTAR }]));

  return (
    <svg
      className={styles.lienzo}
      viewBox="-7 -6 114 74"
      role="img"
      aria-label={etiqueta}
      preserveAspectRatio="xMidYMid meet"
    >
      {escena.aristas.map((a, i) => {
        const p = pos.get(a.a);
        const q = pos.get(a.b);
        if (!p || !q) return null;
        return (
          <g key={i} data-estado={a.estado ?? "normal"} className={styles.arista}>
            <path
              d={`M ${p.x} ${p.y + 4} L ${q.x} ${q.y - 4}`}
              className={styles.trazo}
            />
          </g>
        );
      })}

      {escena.nodos.map((n) => {
        const p = pos.get(n.id)!;
        const s = 4.3;
        return (
          <g key={n.id} data-estado={n.estado ?? "normal"} className={styles.nodo}>
            {n.turno === "hoja" ? (
              <rect
                x={p.x - s}
                y={p.y - s}
                width={s * 2}
                height={s * 2}
                rx={1.2}
                className={styles.disco}
              />
            ) : (
              <polygon
                className={styles.disco}
                points={
                  n.turno === "max"
                    ? `${p.x},${p.y - s - 0.6} ${p.x + s + 0.8},${p.y + s} ${p.x - s - 0.8},${p.y + s}`
                    : `${p.x},${p.y + s + 0.6} ${p.x + s + 0.8},${p.y - s} ${p.x - s - 0.8},${p.y - s}`
                }
              />
            )}
            <text
              x={p.x}
              y={p.y + (n.turno === "max" ? 2.6 : n.turno === "min" ? -0.6 : 1.2)}
              className={styles.dentro}
            >
              {t(n.etiqueta)}
            </text>
            {n.ventana && (
              <text x={p.x} y={p.y - s - 2.2} className={styles.etiqueta}>
                {t(n.ventana)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
