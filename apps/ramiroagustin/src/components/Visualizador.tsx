import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@sites/ui";
import {
  ALGORITMOS,
  CATEGORIAS,
  deCategoria,
  porId,
  type Definicion,
  type Escenario,
} from "../algoritmos/definiciones";
import { armar, ESCENARIOS } from "../algoritmos/escenarios";
import type { ItemPanel, PasoEscena } from "../algoritmos/escena";
import { useIdioma } from "../i18n/contexto";
import {
  COLS,
  correrAEstrella,
  correrDijkstra,
  DESTINO,
  nombre,
  ORIGEN,
  type Paso,
  type Terreno,
} from "../algoritmos/motor";
import { Dibujante } from "./Dibujante";
import styles from "./Visualizador.module.css";

const COMPARAR = "comparar";

/**
 * Estado del tablero en un paso dado.
 *
 * Se reconstruye recorriendo los pasos desde el principio en vez de guardar
 * una foto por paso: son más de mil por corrida y guardar 187 celdas en cada
 * una sería desperdiciar memoria para ahorrar un bucle que corre en un
 * milisegundo. Además es lo que permite arrastrar la barra de tiempo hacia
 * atrás sin re-ejecutar el algoritmo.
 *
 * Los otros nueve algoritmos no necesitan esto: sus escenas ya son fotos
 * completas, porque un grafo de seis nodos entra entero en cada paso.
 */
type Acumulado = {
  cerrados: Set<number>;
  etiquetas: Map<number, number>;
  camino: number[] | null;
  paso: Paso;
};

function acumular(pasos: Paso[], n: number): Acumulado {
  const limite = Math.min(Math.max(n, 0), pasos.length - 1);
  const cerrados = new Set<number>();
  const etiquetas = new Map<number, number>();
  let camino: number[] | null = null;

  for (let i = 0; i <= limite; i++) {
    const p = pasos[i]!;
    if (p.cerrar !== null) cerrados.add(p.cerrar);
    if (p.etiqueta) etiquetas.set(p.etiqueta.id, p.etiqueta.valor);
    if (p.camino) camino = p.camino;
  }

  return { cerrados, etiquetas, camino, paso: pasos[limite]! };
}

/** La frontera de la grilla, con la forma que usa el panel de todos. */
const comoPanel = (frontera: Paso["frontera"]): ItemPanel[] =>
  frontera.map((f, i) => ({
    clave: f.texto,
    texto: nombre(f.id),
    nota: i === 0 ? { es: "↑ sale", en: "↑ next out" } : undefined,
    destacado: i === 0,
  }));

function Grilla({
  terreno,
  estado,
  sellando,
  marca,
  etiqueta,
}: {
  terreno: Terreno[];
  estado: Acumulado;
  /** Celda que se sella en este paso, o null cuando no hay que animar. */
  sellando: number | null;
  /** Cambia en cada paso: fuerza a React a remontar la celda que se sella,
      que es lo que reinicia la animación. */
  marca: number;
  etiqueta: string;
}) {
  const pendientes = new Set(estado.paso.frontera.map((f) => f.id));
  const enCamino = estado.camino ? new Set(estado.camino) : null;

  return (
    <div
      className={styles.grilla}
      style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      role="img"
      aria-label={etiqueta}
    >
      {terreno.map((tipo, i) => {
        let est = "";
        if (enCamino?.has(i)) est = "camino";
        else if (i === estado.paso.actual) est = "actual";
        else if (pendientes.has(i)) est = "cola";
        else if (estado.cerrados.has(i)) est = "cerrado";

        const sella = sellando === i;
        const valor = estado.etiquetas.get(i);

        return (
          <div
            key={sella ? `sello-${marca}` : i}
            className={sella ? `${styles.celda} ${styles.sello}` : styles.celda}
            data-terreno={tipo}
            data-estado={est || undefined}
            data-hito={i === ORIGEN ? "O" : i === DESTINO ? "D" : undefined}
          >
            {tipo === "muro" || valor === undefined ? "" : valor}
          </div>
        );
      })}
    </div>
  );
}

export function Visualizador() {
  const { idioma, t } = useIdioma();
  const [algoritmoId, setAlgoritmoId] = useState("dijkstra");
  const [escenarioId, setEscenarioId] = useState("rodeo");
  const [indice, setIndice] = useState(0);
  const [animar, setAnimar] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidad, setVelocidad] = useState(60);
  const [pestana, setPestana] = useState<"codigo" | "cola">("codigo");
  const montado = useRef(false);

  const comparando = algoritmoId === COMPARAR;
  const def: Definicion | null = comparando ? null : porId(algoritmoId);
  const deGrilla = comparando || def!.familia === "grilla";

  // El escenario elegido puede no existir para el algoritmo nuevo —los
  // tableros son de los cuatro de la grilla y nada más—, así que se cae al
  // primero en vez de guardarse un estado inválido o forzar un efecto.
  const escenarios: Escenario[] = comparando ? tablerosComoEscenarios() : def!.escenarios;
  const escenario = escenarios.find((e) => e.id === escenarioId) ?? escenarios[0]!;

  const terreno = useMemo(
    () =>
      deGrilla
        ? armar(ESCENARIOS.find((e) => e.id === escenario.id) ?? ESCENARIOS[0]!)
        : null,
    [deGrilla, escenario.id],
  );

  const pasos = useMemo<Paso[] | null>(() => {
    if (!terreno) return null;
    if (comparando) return correrDijkstra(terreno);
    return def!.familia === "grilla" ? def!.correr(terreno) : null;
  }, [comparando, def, terreno]);

  const pasosB = useMemo(
    () => (comparando && terreno ? correrAEstrella(terreno) : null),
    [comparando, terreno],
  );

  const escenas = useMemo<PasoEscena[] | null>(
    () => (def && def.familia === "escena" ? def.correr(escenario.id) : null),
    [def, escenario.id],
  );

  const total = comparando
    ? Math.max(pasos!.length, pasosB!.length)
    : (pasos?.length ?? escenas!.length);

  const estado = useMemo(() => (pasos ? acumular(pasos, indice) : null), [pasos, indice]);
  const estadoB = useMemo(
    () => (pasosB ? acumular(pasosB, indice) : null),
    [pasosB, indice],
  );
  const cuadro = escenas
    ? escenas[Math.min(Math.max(indice, 0), escenas.length - 1)]!
    : null;

  const linea = cuadro ? cuadro.linea : (estado?.paso.linea ?? 0);
  const narracion = cuadro ? cuadro.texto : (estado?.paso.texto ?? "");
  const items: ItemPanel[] = cuadro
    ? cuadro.panel
    : comoPanel(estado?.paso.frontera ?? []);

  // Abre a mitad de la corrida y en pausa: el primer vistazo tiene que mostrar
  // qué hace esto, no un tablero vacío esperando un clic. El prerender emite el
  // paso 0, y esto lo adelanta apenas hidrata.
  useEffect(() => {
    setIndice(Math.floor(total * 0.42));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cambiar de algoritmo o de escenario reinicia y arranca solo: el usuario
  // pidió ver otra cosa, no quedarse mirando un tablero congelado.
  useEffect(() => {
    if (!montado.current) {
      montado.current = true;
      return;
    }
    setIndice(0);
    setAnimar(false);
    setReproduciendo(true);
  }, [algoritmoId, escenario.id]);

  // Una cadena de timeouts en vez de un intervalo: al depender del índice, se
  // reprograma sola cuando el usuario arrastra la barra o cambia la velocidad,
  // sin dejar un intervalo viejo corriendo en paralelo.
  useEffect(() => {
    if (!reproduciendo) return;
    if (indice >= total - 1) {
      setReproduciendo(false);
      return;
    }
    const id = setTimeout(() => {
      setIndice((n) => n + 1);
      setAnimar(true);
    }, velocidad);
    return () => clearTimeout(id);
  }, [reproduciendo, indice, velocidad, total]);

  const resumen = estado?.paso.resumen;
  const sellando = animar ? (estado?.paso.cerrar ?? null) : null;

  const irA = (n: number) => {
    setReproduciendo(false);
    setAnimar(false);
    setIndice(n);
  };

  return (
    <div className={styles.visualizador}>
      {CATEGORIAS.map((categoria) => (
        <div
          key={categoria.id}
          className={styles.filaSelector}
          role="group"
          aria-label={t(categoria.nombre)}
        >
          <span className={styles.etiquetaSelector}>{t(categoria.nombre)}</span>
          {deCategoria(categoria.id).map((a) => (
            <button
              key={a.id}
              type="button"
              className={styles.opcion}
              aria-pressed={algoritmoId === a.id}
              onClick={() => setAlgoritmoId(a.id)}
            >
              {t(a.nombre)}
            </button>
          ))}
        </div>
      ))}

      <div
        className={styles.filaSelector}
        role="group"
        aria-label={t({ es: "Comparar", en: "Compare" })}
      >
        <span className={styles.etiquetaSelector}>
          {t({ es: "Lado a lado", en: "Side by side" })}
        </span>
        <button
          type="button"
          className={styles.opcion}
          aria-pressed={comparando}
          onClick={() => setAlgoritmoId(COMPARAR)}
        >
          Dijkstra vs A*
        </button>
      </div>

      <div
        className={styles.filaSelector}
        role="group"
        aria-label={t({ es: "Escenario", en: "Scenario" })}
      >
        <span className={styles.etiquetaSelector}>
          {t({ es: "Escenario", en: "Scenario" })}
        </span>
        {escenarios.map((e) => (
          <button
            key={e.id}
            type="button"
            className={styles.opcion}
            aria-pressed={escenario.id === e.id}
            onClick={() => setEscenarioId(e.id)}
          >
            {t(e.nombre)}
          </button>
        ))}
      </div>

      {/* El HTML de las tesis y las narraciones es literal nuestro, escrito en
          definiciones.ts y en los motores. No hay entrada de usuario en el camino. */}
      <p
        className={styles.tesis}
        dangerouslySetInnerHTML={{
          __html: comparando
            ? t({
                es: "El mismo tablero y los dos algoritmos, paso a paso. <em>La diferencia no está en el camino que encuentran —es el mismo, y los dos son óptimos— sino en cuánto tablero tienen que abrir para estar seguros.</em>",
                en: "The same board and both algorithms, step by step. <em>The difference is not in the path they find —it is the same path, and both are optimal— but in how much of the board they have to open to be sure.</em>",
              })
            : t(def!.tesis),
        }}
      />

      <div className={comparando ? `${styles.taller} ${styles.ancho}` : styles.taller}>
        <div className={styles.columna}>
          {comparando ? (
            <div className={styles.comparar}>
              <div className={styles.lado}>
                <div className={styles.ladoCabecera}>
                  <span className={styles.ladoNombre}>Dijkstra</span>
                  <span className={styles.ladoContador}>
                    {estado!.paso.cerrados}{" "}
                    <span>{t({ es: "celdas abiertas", en: "cells opened" })}</span>
                  </span>
                </div>
                <div className={styles.marco}>
                  <Grilla
                    terreno={terreno!}
                    estado={estado!}
                    sellando={sellando}
                    marca={indice}
                    etiqueta={t({
                      es: "Recorrido de Dijkstra",
                      en: "Dijkstra\u2019s traversal",
                    })}
                  />
                </div>
              </div>
              <div className={styles.lado}>
                <div className={styles.ladoCabecera}>
                  <span className={styles.ladoNombre}>A*</span>
                  <span className={styles.ladoContador}>
                    {estadoB!.paso.cerrados}{" "}
                    <span>{t({ es: "celdas abiertas", en: "cells opened" })}</span>
                  </span>
                </div>
                <div className={styles.marco}>
                  <Grilla
                    terreno={terreno!}
                    estado={estadoB!}
                    sellando={animar ? estadoB!.paso.cerrar : null}
                    marca={indice}
                    etiqueta={t({
                      es: "Recorrido de A estrella",
                      en: "A-star traversal",
                    })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.marco}>
              {cuadro ? (
                <Dibujante
                  escena={cuadro.escena}
                  etiqueta={t({
                    es: `${t(def!.nombre)} paso a paso`,
                    en: `${t(def!.nombre)} step by step`,
                  })}
                />
              ) : (
                <Grilla
                  terreno={terreno!}
                  estado={estado!}
                  sellando={sellando}
                  marca={indice}
                  etiqueta={t({
                    es: `Recorrido de ${t(def!.nombre)}`,
                    en: `${t(def!.nombre)} traversal`,
                  })}
                />
              )}
            </div>
          )}

          {deGrilla && (
            <div className={styles.leyenda}>
              <span>
                <span className={`${styles.chip} ${styles.chipCola}`} />
                {t({ es: "Pendiente", en: "Pending" })}
              </span>
              <span>
                <span className={`${styles.chip} ${styles.chipCerrado}`} />
                {t({ es: "Ya resuelta", en: "Settled" })}
              </span>
              <span>
                <span className={`${styles.chip} ${styles.chipActual}`} />
                {t({ es: "Mirando ahora", en: "Looking at it now" })}
              </span>
              <span>
                {t({ es: "O = origen · D = destino", en: "O = start · D = destination" })}
              </span>
            </div>
          )}

          {!comparando && (
            <div className={styles.narracion}>
              <p className={styles.narracionTitulo}>
                {t({ es: "Qué está pasando", en: "What is happening" })}
              </p>
              <p
                className={styles.narracionTexto}
                dangerouslySetInnerHTML={{ __html: t(narracion) }}
              />
            </div>
          )}

          {comparando ? (
            <ResultadoComparado
              a={pasos![pasos!.length - 1]!.resumen!}
              b={pasosB![pasosB!.length - 1]!.resumen!}
              listo={indice >= total - 1}
            />
          ) : cuadro ? (
            cuadro.veredicto && (
              <p
                className={styles.resultado}
                dangerouslySetInnerHTML={{ __html: t(cuadro.veredicto) }}
              />
            )
          ) : (
            resumen && (
              <Resultado resumen={resumen} algoritmoId={algoritmoId} terreno={terreno!} />
            )
          )}

          <div className={styles.controles}>
            <Button
              size="sm"
              onClick={() => {
                if (reproduciendo) return setReproduciendo(false);
                if (indice >= total - 1) setIndice(0);
                setReproduciendo(true);
              }}
            >
              {reproduciendo
                ? t({ es: "Pausar", en: "Pause" })
                : t({ es: "Reproducir", en: "Play" })}
            </Button>
            <Button
              variant="soft"
              size="sm"
              onClick={() => {
                setReproduciendo(false);
                if (indice < total - 1) {
                  setIndice(indice + 1);
                  setAnimar(true);
                }
              }}
            >
              {t({ es: "Un paso", en: "One step" })}
            </Button>
            <Button variant="soft" size="sm" onClick={() => irA(0)}>
              {t({ es: "Volver al inicio", en: "Back to the start" })}
            </Button>
            <label className={styles.selector}>
              <span>{t({ es: "Velocidad", en: "Speed" })}</span>
              <select
                value={velocidad}
                onChange={(e) => setVelocidad(Number(e.target.value))}
              >
                <option value={240}>{t({ es: "Lenta", en: "Slow" })}</option>
                <option value={60}>{t({ es: "Normal", en: "Normal" })}</option>
                <option value={8}>{t({ es: "Rápida", en: "Fast" })}</option>
              </select>
            </label>
          </div>

          <div className={styles.lineaTiempo}>
            <input
              type="range"
              min={0}
              max={Math.max(total - 1, 0)}
              value={indice}
              aria-label={t({ es: "Avanzar al paso", en: "Jump to step" })}
              onChange={(e) => irA(Number(e.target.value))}
            />
            <span className={styles.pasoNum}>
              {indice + 1} / {total}
            </span>
          </div>
        </div>

        {!comparando && (
          <div className={styles.columna}>
            <div className={styles.pestanas} role="tablist">
              <button
                type="button"
                role="tab"
                className={styles.pestana}
                aria-selected={pestana === "codigo"}
                onClick={() => setPestana("codigo")}
              >
                {t({ es: "Código", en: "Code" })}
              </button>
              <button
                type="button"
                role="tab"
                className={styles.pestana}
                aria-selected={pestana === "cola"}
                onClick={() => setPestana("cola")}
              >
                {t({ es: "Estado", en: "State" })}
              </button>
            </div>

            <section
              className={
                pestana === "codigo"
                  ? styles.seccionPanel
                  : `${styles.seccionPanel} ${styles.ocultaEnMovil}`
              }
            >
              <p className={styles.panelTitulo}>
                {t({
                  es: "La línea que se está ejecutando",
                  en: "The line being executed",
                })}
              </p>
              <div className={styles.codigo}>
                <ol>
                  {def!.codigo[idioma].map((l, i) => (
                    <li key={i} className={linea === i + 1 ? styles.activa : undefined}>
                      {l}
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section
              className={
                pestana === "cola"
                  ? styles.seccionPanel
                  : `${styles.seccionPanel} ${styles.ocultaEnMovil}`
              }
            >
              <p className={styles.panelTitulo}>{t(def!.panel)}</p>
              <Panel items={items} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/** Los escenarios del comparador son los tableros, igual que los de la grilla. */
function tablerosComoEscenarios(): Escenario[] {
  return ALGORITMOS.find((a) => a.id === "dijkstra")!.escenarios;
}

function Panel({ items }: { items: ItemPanel[] }) {
  const { t } = useIdioma();

  if (!items.length) {
    return (
      <p className={styles.colaVacia}>
        {t({ es: "No queda nada pendiente.", en: "Nothing left pending." })}
      </p>
    );
  }

  const visibles = items.slice(0, 8);

  return (
    <>
      <ul className={styles.colaLista}>
        {visibles.map((it, i) => (
          <li
            key={`${t(it.clave)}-${i}`}
            className={
              it.destacado ? `${styles.colaItem} ${styles.minimo}` : styles.colaItem
            }
          >
            <span className={styles.colaDist}>{t(it.clave)}</span>
            <span className={styles.colaNodo}>{t(it.texto)}</span>
            {it.nota && <span className={styles.colaSale}>{t(it.nota)}</span>}
          </li>
        ))}
      </ul>
      {items.length > visibles.length && (
        <p className={styles.colaResto}>
          {t({
            es: `y ${items.length - visibles.length} más esperando`,
            en: `and ${items.length - visibles.length} more waiting`,
          })}
        </p>
      )}
    </>
  );
}

function Resultado({
  resumen,
  algoritmoId,
  terreno,
}: {
  resumen: NonNullable<Paso["resumen"]>;
  algoritmoId: string;
  terreno: Terreno[];
}) {
  const { t } = useIdioma();

  // Para los que no garantizan el óptimo, el dato que importa es cuánto se
  // pasaron; para A*, cuánto tablero se ahorró. Los dos se miden contra
  // Dijkstra sobre el mismo terreno, así que hay que correrlo.
  const referencia = useMemo(() => {
    if (algoritmoId === "dijkstra") return null;
    const pasos = correrDijkstra(terreno);
    return pasos[pasos.length - 1]!.resumen!;
  }, [algoritmoId, terreno]);

  if (resumen.costo === null) {
    return (
      <p
        className={styles.resultado}
        dangerouslySetInnerHTML={{
          __html: t({
            es: `Sin camino posible. Abrió <b>${resumen.expandidas}</b> celdas —todo lo alcanzable— para poder afirmarlo con certeza.`,
            en: `No path exists. It opened <b>${resumen.expandidas}</b> cells — everything reachable — in order to be able to say so with certainty.`,
          }),
        }}
      />
    );
  }

  const exceso = referencia?.costo != null ? resumen.costo - referencia.costo : 0;

  const barro = (n: number) => ({
    es:
      n === 0
        ? ", sin pisar barro."
        : `, pisando barro ${n} ${n === 1 ? "vez" : "veces"}.`,
    en:
      n === 0
        ? ", without stepping in mud."
        : `, stepping in mud ${n} ${n === 1 ? "time" : "times"}.`,
  });

  const demas = [
    exceso > 0
      ? {
          es: ` El óptimo era <b>${referencia!.costo}</b>: se pasó por <b>${exceso}</b>.`,
          en: ` The optimum was <b>${referencia!.costo}</b>: it overshot by <b>${exceso}</b>.`,
        }
      : { es: "", en: "" },
    algoritmoId === "astar" && referencia
      ? {
          es: ` Dijkstra abrió <b>${referencia.expandidas}</b> para el mismo camino.`,
          en: ` Dijkstra opened <b>${referencia.expandidas}</b> for the same path.`,
        }
      : { es: "", en: "" },
  ];

  return (
    <p
      className={styles.resultado}
      dangerouslySetInnerHTML={{
        __html:
          t({
            es: `Costo <b>${resumen.costo}</b> · camino de <b>${resumen.largo}</b> celdas · abrió <b>${resumen.expandidas}</b> para encontrarlo`,
            en: `Cost <b>${resumen.costo}</b> · a path of <b>${resumen.largo}</b> cells · opened <b>${resumen.expandidas}</b> to find it`,
          }) +
          t(barro(resumen.barro)) +
          demas.map((d) => t(d)).join(""),
      }}
    />
  );
}

function ResultadoComparado({
  a,
  b,
  listo,
}: {
  a: NonNullable<Paso["resumen"]>;
  b: NonNullable<Paso["resumen"]>;
  listo: boolean;
}) {
  const { t } = useIdioma();

  if (!listo) return null;

  if (a.costo === null) {
    return (
      <p
        className={styles.resultado}
        dangerouslySetInnerHTML={{
          __html: t({
            es: `Ninguno de los dos llega: no hay camino. Los dos tuvieron que abrir el mapa entero para saberlo — <b>${a.expandidas}</b> celdas cada uno. La corazonada no ayuda cuando la respuesta es «no existe».`,
            en: `Neither of them arrives: there is no path. Both had to open the entire map to know that — <b>${a.expandidas}</b> cells each. A hunch is no help when the answer is «it does not exist».`,
          }),
        }}
      />
    );
  }

  const ahorro = Math.round((1 - b.expandidas / a.expandidas) * 100);

  return (
    <p
      className={styles.resultado}
      dangerouslySetInnerHTML={{
        __html: t({
          es: `Mismo camino y mismo costo <b>${a.costo}</b>. Dijkstra abrió <b>${a.expandidas}</b> celdas; A*, <b>${b.expandidas}</b>: un <b>${ahorro}%</b> menos de tablero para llegar a la misma respuesta.`,
          en: `Same path and same cost <b>${a.costo}</b>. Dijkstra opened <b>${a.expandidas}</b> cells; A*, <b>${b.expandidas}</b>: <b>${ahorro}%</b> less board to reach the very same answer.`,
        }),
      }}
    />
  );
}
