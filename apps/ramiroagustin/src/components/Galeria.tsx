import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import { useLockBodyScroll, usePrefersReducedMotion } from "@sites/ui";
import type { Captura, Juego } from "../data/capturas";
import styles from "./Galeria.module.css";

/** Ancho de render de la captura: el de una diapositiva, que es el 86 % del
 *  ancho útil de la tarjeta —el resto es el asomo de la siguiente—. Ver
 *  `--diapo` en Galeria.module.css, que es de donde sale ese número. */
const MEDIDAS_TARJETA = "(min-width: 62rem) 908px, calc((100vw - 6rem) * 0.86)";

/**
 * Debajo de este ancho se sirve el recorte cerrado, el que sale de las
 * capturas hechas en un teléfono: el de escritorio, servido en 390 px, deja el
 * texto del sistema en tres píxeles. Es el mismo corte con el que la tira
 * cambia de forma en Galeria.module.css, y los dos tienen que decir lo mismo.
 */
const CORTE_TELEFONO = "(max-width: 40rem)";

/** En el teléfono la tarjeta va de borde a borde, así que la diapositiva es el
 *  86 % de la pantalla. */
const MEDIDAS_FOCO = "calc(100vw * 0.86)";

/** En la lupa la imagen ocupa casi todo el ancho, con tope en 1200px. */
const MEDIDAS_LUPA = "(min-width: 78rem) 1200px, 96vw";

type Fuente = {
  juego: Juego;
  medidas: string;
  /** Sin `media` la fuente vale para cualquier ancho de ventana. */
  media?: string;
};

type ImagenProps = {
  /** En el orden en que el navegador las prueba: gana la primera que aplique. */
  fuentes: readonly Fuente[];
  alt: string;
  className?: string;
  carga: "eager" | "lazy";
};

/**
 * La última fuente de la lista es la que sostiene el `<img>` y va sin `media`:
 * es la que responde cuando ninguna otra aplica. Sus medidas son las que
 * reservan el hueco hasta que llega el CSS; de ahí en más manda el
 * `aspect-ratio` de la hoja de estilos, y tiene que ser así porque el recorte
 * de teléfono no viene en la misma proporción que el de escritorio.
 */
function Imagen({ fuentes, alt, className, carga }: ImagenProps) {
  const base = fuentes[fuentes.length - 1];
  if (!base) return null;

  return (
    <picture>
      {fuentes.map(({ juego, medidas, media }) => (
        <Fragment key={media ?? "base"}>
          <source type="image/avif" media={media} srcSet={juego.avif} sizes={medidas} />
          <source type="image/webp" media={media} srcSet={juego.webp} sizes={medidas} />
          {/* El jpg de la base va en el `<img>`, pero el de una fuente con
              `media` necesita su propia línea: sin ella, el navegador que no
              entienda ni avif ni webp se llevaría el recorte equivocado. */}
          {media ? (
            <source type="image/jpeg" media={media} srcSet={juego.jpg} sizes={medidas} />
          ) : null}
        </Fragment>
      ))}
      <img
        src={base.juego.respaldo}
        srcSet={base.juego.jpg}
        sizes={base.medidas}
        width={base.juego.ancho}
        height={base.juego.alto}
        alt={alt}
        className={className}
        loading={carga}
        decoding="async"
      />
    </picture>
  );
}

function Chevron({ hacia }: { hacia: "izquierda" | "derecha" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none">
      <path
        d={hacia === "izquierda" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type GaleriaProps = {
  capturas: readonly Captura[];
  /** Nombre del proyecto: arma las etiquetas accesibles de los controles. */
  proyecto: string;
};

/**
 * Las capturas del sistema en una tira que se desliza, más una lupa que
 * muestra la pantalla entera.
 *
 * La tira es un contenedor que scrollea, no un slider escrito en JavaScript.
 * El gesto del dedo es el scroll nativo —con su inercia y su rebote— en vez de
 * una imitación a fuerza de eventos táctiles, el teclado la recorre sola
 * porque un contenedor que scrollea recibe el foco, y sin JavaScript sigue
 * siendo una tira de capturas que se puede recorrer.
 *
 * Lo único que se agrega desde acá son las dos flechas, para quien tiene mouse
 * y no rueda horizontal, y la lupa. Las flechas no llevan estado de "cuál es
 * la activa": corren la tira un paso, que es lo que mide una diapositiva con
 * su separación, y el navegador la frena sola en las puntas.
 */
export function Galeria({ capturas, proyecto }: GaleriaProps) {
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  /** Si se abrió alguna vez. Antes de eso la lupa no monta nada, así que la
   *  página entera de una captura —que pesa cuatro veces lo que el recorte— no
   *  se descarga hasta que alguien la pide. Después queda montada: si se la
   *  desmontara al cerrar, la animación de salida no tendría qué animar. */
  const [usada, setUsada] = useState(false);

  /** Si la tira llegó a una punta, para apagar la flecha que ya no lleva a
   *  ningún lado. Es todo lo que hay que saber del scroll. */
  const [puntas, setPuntas] = useState({ inicio: true, fin: false });

  const lista = useRef<HTMLUListElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  /** Última captura vista en la lupa: al cerrar, la página vuelve ahí. */
  const ultima = useRef(0);

  const quieto = usePrefersReducedMotion();
  useLockBodyScroll(ampliada !== null);

  const total = capturas.length;

  const alScrollear = (evento: UIEvent<HTMLUListElement>) => {
    const nodo = evento.currentTarget;
    // Un margen de holgura: el scroll no siempre cae en el píxel exacto, y sin
    // esto la flecha del final queda encendida sin nada que mostrar.
    const inicio = nodo.scrollLeft < 8;
    const fin = nodo.scrollLeft > nodo.scrollWidth - nodo.clientWidth - 8;
    // Devolver el mismo objeto cuando nada cambió evita renderizar de nuevo en
    // cada cuadro del scroll.
    setPuntas((antes) =>
      antes.inicio === inicio && antes.fin === fin ? antes : { inicio, fin },
    );
  };

  /**
   * Corre la tira una diapositiva. El paso se mide en el DOM —la distancia
   * entre el borde de una y el de la siguiente— y no se escribe a mano: así
   * incluye la separación y sigue siendo correcto cuando el CSS cambia el
   * ancho de la diapositiva en otro tamaño de pantalla.
   */
  const deslizar = (signo: 1 | -1) => {
    const nodo = lista.current;
    const primera = nodo?.children[0] as HTMLElement | undefined;
    const segunda = nodo?.children[1] as HTMLElement | undefined;
    if (!nodo || !primera) return;
    const paso = segunda ? segunda.offsetLeft - primera.offsetLeft : nodo.clientWidth;
    nodo.scrollBy({ left: signo * paso, behavior: quieto ? "auto" : "smooth" });
  };

  // Agrandada, la captura es mucho más ancha que la ventana, y el borde
  // izquierdo de una pantalla de sistema es margen vacío. Se arranca en el
  // medio, que es donde está el contenido.
  useEffect(() => {
    const nodo = cuerpo.current;
    if (!zoom || !nodo) return;
    nodo.scrollLeft = (nodo.scrollWidth - nodo.clientWidth) / 2;
  }, [zoom]);

  // `showModal` no tiene equivalente declarativo: el estado de React manda y
  // este efecto lo empuja al método imperativo del <dialog>. A cambio se
  // heredan gratis el foco atrapado, el `inert` del resto de la página y el
  // Escape que cierra.
  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    if (ampliada !== null && !nodo.open) nodo.showModal();
    if (ampliada === null && nodo.open) nodo.close();
  }, [ampliada]);

  // Cada captura empieza sin agrandar y desde arriba, también al pasar de una
  // a la siguiente con las flechas.
  useEffect(() => {
    if (ampliada !== null) ultima.current = ampliada;
    setZoom(false);
    cuerpo.current?.scrollTo({ top: 0, left: 0 });
  }, [ampliada]);

  const alternarZoom = () => setZoom((valor) => !valor);

  const moverLupa = (paso: number) =>
    setAmpliada((indice) =>
      indice === null ? null : Math.min(total - 1, Math.max(0, indice + paso)),
    );

  /**
   * Al cerrar, la página queda donde quedó la lupa. El foco se mueve a mano
   * porque el <dialog> lo devolvería al botón desde el que se abrió: si se
   * recorrieron cuatro capturas con las flechas, volver a la primera manda a
   * quien mira a otra altura de la página que la que estaba viendo.
   */
  const alCerrar = useCallback(() => {
    const indice = ultima.current;
    setAmpliada(null);
    const diapo = lista.current?.children[indice] as HTMLElement | undefined;
    diapo?.querySelector("button")?.focus();
  }, []);

  // `close` no burbujea, y React reparte los eventos desde la raíz del árbol:
  // el `onClose` en el JSX nunca llega. Hay que escucharlo en el elemento. Sin
  // esto, cerrar con Escape deja el estado creyendo que la lupa sigue abierta
  // —y con ella el scroll de la página bloqueado.
  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    nodo.addEventListener("close", alCerrar);
    return () => nodo.removeEventListener("close", alCerrar);
  }, [alCerrar]);

  const teclasLupa = (evento: KeyboardEvent) => {
    if (evento.key === "ArrowRight") moverLupa(1);
    if (evento.key === "ArrowLeft") moverLupa(-1);
  };

  const enLupa = usada ? capturas[ampliada ?? ultima.current] : undefined;
  if (total === 0) return null;

  return (
    <div className={styles.galeria}>
      <div className={styles.marco}>
        <ul
          className={styles.pista}
          ref={lista}
          tabIndex={0}
          aria-label={`Capturas de ${proyecto}`}
          onScroll={alScrollear}
        >
          {capturas.map((captura, i) => (
            <li key={captura.id} className={styles.diapo}>
              <button
                type="button"
                className={styles.abrir}
                onClick={() => {
                  setUsada(true);
                  setAmpliada(i);
                }}
                aria-label={`Ampliar: ${captura.titulo}`}
              >
                <Imagen
                  fuentes={[
                    { juego: captura.foco, medidas: MEDIDAS_FOCO, media: CORTE_TELEFONO },
                    { juego: captura.detalle, medidas: MEDIDAS_TARJETA },
                  ]}
                  alt={captura.alt}
                  className={styles.shot}
                  carga={i === 0 ? "eager" : "lazy"}
                />
                <span className={styles.insignia} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <path
                      d="M9 3H3v6M15 3h6v6M15 21h6v-6M9 21H3v-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className={styles.insigniaTexto}>Ver la pantalla entera</span>
                </span>
                <span className={styles.contador} aria-hidden="true">
                  {i + 1} / {total}
                </span>
              </button>

              <div className={styles.pie}>
                <p className={styles.pieTitulo}>{captura.titulo}</p>
                <p className={styles.pieTexto}>{captura.pie}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className={`${styles.flecha} ${styles.anterior}`}
          onClick={() => deslizar(-1)}
          disabled={puntas.inicio}
          aria-label="Captura anterior"
        >
          <Chevron hacia="izquierda" />
        </button>
        <button
          type="button"
          className={`${styles.flecha} ${styles.siguiente}`}
          onClick={() => deslizar(1)}
          disabled={puntas.fin}
          aria-label="Captura siguiente"
        >
          <Chevron hacia="derecha" />
        </button>
      </div>

      {/* Dónde va la tira. La mueve el propio scroll con una línea de tiempo de
          CSS, sin JavaScript; donde eso no existe, no se muestra. Ver
          Galeria.module.css. */}
      <div className={styles.progreso} aria-hidden="true" />

      <dialog
        ref={dialogo}
        className={styles.lupa}
        aria-label={`Capturas de ${proyecto} ampliadas`}
        onKeyDown={teclasLupa}
      >
        {enLupa ? (
          <div className={styles.lupaCaja}>
            <div className={styles.barra}>
              <div className={styles.barraTitulo}>
                <p className={styles.barraNombre}>{enLupa.titulo}</p>
                <span className={styles.barraContador}>
                  {(ampliada ?? 0) + 1} / {total}
                </span>
              </div>

              <div className={styles.barraBotones}>
                <button
                  type="button"
                  className={styles.control}
                  onClick={alternarZoom}
                  aria-pressed={zoom}
                >
                  {zoom ? "Achicar" : "Agrandar"}
                </button>
                <button
                  type="button"
                  className={styles.control}
                  onClick={() => moverLupa(-1)}
                  disabled={ampliada === 0}
                  aria-label="Captura anterior"
                >
                  <Chevron hacia="izquierda" />
                </button>
                <button
                  type="button"
                  className={styles.control}
                  onClick={() => moverLupa(1)}
                  disabled={ampliada === total - 1}
                  aria-label="Captura siguiente"
                >
                  <Chevron hacia="derecha" />
                </button>
                <button
                  type="button"
                  className={styles.control}
                  onClick={() => dialogo.current?.close()}
                  aria-label="Cerrar"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              className={styles.lupaCuerpo}
              ref={cuerpo}
              data-zoom={zoom || undefined}
              // Clic en el fondo, fuera de la imagen: cierra. Es lo que hace
              // todo visor, y la alternativa —buscar la cruz— es peor.
              onClick={(evento) => {
                if (evento.target === evento.currentTarget) dialogo.current?.close();
              }}
            >
              <figure className={styles.lupaFigura}>
                <div className={styles.lupaMarco} onClick={alternarZoom}>
                  <Imagen
                    key={enLupa.id}
                    fuentes={[{ juego: enLupa.completa, medidas: MEDIDAS_LUPA }]}
                    alt={enLupa.alt}
                    className={styles.lupaImagen}
                    carga="eager"
                  />
                </div>
                <figcaption className={styles.lupaPie}>{enLupa.pie}</figcaption>
              </figure>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
