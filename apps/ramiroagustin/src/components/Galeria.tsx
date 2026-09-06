import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useLockBodyScroll, useMediaQuery, usePrefersReducedMotion } from "@sites/ui";
import type { Captura, Juego } from "../data/capturas";
import styles from "./Galeria.module.css";

/** Ancho de render en la tarjeta: el ancho útil del contenedor. Debajo de
 *  62rem es el viewport menos el gutter y el padding de la tarjeta. */
const MEDIDAS_TARJETA = "(min-width: 62rem) 1056px, calc(100vw - 6rem)";

/**
 * Debajo de este ancho la galería deja de ser un carrusel: las capturas se
 * apilan, van de un borde al otro de la pantalla y cada una lleva su pie
 * debajo. Es también el corte a partir del cual se sirve el recorte cerrado, y
 * no por casualidad: es el ancho donde el recorte de escritorio deja de leerse
 * y donde al carrusel ya no le sobra lugar para deslizarse.
 */
const CORTE_TELEFONO = "(max-width: 40rem)";

/** Apilada, la captura ocupa el ancho entero de la pantalla. */
const MEDIDAS_FOCO = "100vw";

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
 * reservan el hueco de la imagen, y sirven también para las demás porque todas
 * las versiones de una captura salen en la misma proporción.
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
 * Galería de capturas: un carrusel que se desliza y una lupa que muestra la
 * pantalla entera.
 *
 * El carrusel es un contenedor que scrollea, no un slider escrito en
 * JavaScript. Así arrastrar en el teléfono es el scroll nativo —con su inercia
 * y su rebote— en vez de una imitación a fuerza de eventos táctiles, y sin JS
 * la galería sigue siendo una tira de imágenes que se puede recorrer. Los
 * botones, los puntos y la lupa son el agregado que sí necesita JavaScript.
 */
export function Galeria({ capturas, proyecto }: GaleriaProps) {
  const [activa, setActiva] = useState(0);
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);

  const pista = useRef<HTMLUListElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  /** Última captura vista en la lupa: al cerrar, el carrusel queda ahí. */
  const ultima = useRef(0);
  /** El scroll en curso lo pidió `irA`, no el dedo ni la rueda. */
  const navegando = useRef(false);

  const quieto = usePrefersReducedMotion();
  /** Apilada, la galería no tiene carrusel que manejar: no hay captura activa
   *  ni nada que desplazar, están todas a la vista. */
  const apilado = useMediaQuery(CORTE_TELEFONO);
  useLockBodyScroll(ampliada !== null);

  const total = capturas.length;

  const irA = useCallback(
    (indice: number) => {
      const nodo = pista.current;
      const diapo = nodo?.children[indice] as HTMLElement | undefined;
      if (!nodo || !diapo) return;

      // Animar ocho capturas de corrido —el salto que hace un punto del otro
      // extremo— tarda segundos y no se entiende: solo se anima el paso a la
      // captura de al lado, que es el que hay que poder seguir con la vista.
      const salto = Math.abs(diapo.offsetLeft - nodo.scrollLeft) > nodo.clientWidth * 1.5;
      navegando.current = true;
      nodo.scrollTo({
        left: diapo.offsetLeft,
        behavior: quieto || salto ? "auto" : "smooth",
      });
    },
    [quieto],
  );

  // Cuál es la captura activa lo dice el scroll, no el último botón apretado:
  // en el teléfono se llega deslizando, y ahí no hay ningún botón de por medio.
  useEffect(() => {
    const nodo = pista.current;
    if (!nodo || apilado || typeof IntersectionObserver === "undefined") return;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          const indice = Number((entrada.target as HTMLElement).dataset.indice);
          if (!Number.isNaN(indice)) setActiva(indice);
        }
      },
      { root: nodo, threshold: 0.6 },
    );

    for (const diapo of nodo.children) observador.observe(diapo);
    return () => observador.disconnect();
  }, [total, apilado]);

  // En escritorio el carrusel no lleva `scroll-snap-type` —ver el porqué en
  // Galeria.module.css—, así que una rodada horizontal puede dejarlo a mitad
  // de camino entre dos capturas. Cuando el scroll termina, se acomoda a la
  // más cercana. Donde el snap del CSS sí está activo esto no hace nada: la
  // captura ya quedó en su lugar.
  useEffect(() => {
    const nodo = pista.current;
    if (!nodo || apilado) return;

    const acomodar = () => {
      // Lo que movió `irA` ya está donde tiene que estar; volver a acomodarlo
      // encadenaría un scroll sobre otro.
      if (navegando.current) {
        navegando.current = false;
        return;
      }

      const ancho = nodo.clientWidth;
      if (!ancho) return;
      const diapo = nodo.children[Math.round(nodo.scrollLeft / ancho)] as
        HTMLElement | undefined;
      if (!diapo || Math.abs(nodo.scrollLeft - diapo.offsetLeft) < 1) return;
      nodo.scrollTo({ left: diapo.offsetLeft, behavior: quieto ? "auto" : "smooth" });
    };

    nodo.addEventListener("scrollend", acomodar);
    return () => nodo.removeEventListener("scrollend", acomodar);
  }, [quieto, apilado]);

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
   * Al cerrar, el carrusel se pone donde quedó la lupa. El foco se mueve a
   * mano y con `preventScroll`: si se lo dejara al <dialog>, volvería al botón
   * de la captura desde la que se abrió y el navegador arrastraría el scroll
   * de vuelta a esa, deshaciendo el recorrido.
   */
  const alCerrar = useCallback(() => {
    const indice = ultima.current;
    setAmpliada(null);
    setActiva(indice);
    const diapo = pista.current?.children[indice] as HTMLElement | undefined;
    // Apilado es al revés: las capturas están una debajo de la otra, así que
    // el scroll que arrastra el foco es justamente el que hay que dejar pasar
    // —si no, cerrar en la novena devuelve a quien mira a la altura de la
    // tercera, que es donde había abierto la lupa.
    diapo?.querySelector("button")?.focus({ preventScroll: !apilado });
    irA(indice);
  }, [irA, apilado]);

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

  const teclasPista = (evento: KeyboardEvent) => {
    if (apilado) return;
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    irA(
      Math.min(total - 1, Math.max(0, activa + (evento.key === "ArrowRight" ? 1 : -1))),
    );
  };

  const teclasLupa = (evento: KeyboardEvent) => {
    if (evento.key === "ArrowRight") moverLupa(1);
    if (evento.key === "ArrowLeft") moverLupa(-1);
  };

  const enLupa = ampliada === null ? undefined : capturas[ampliada];
  if (total === 0) return null;

  return (
    <div>
      <div className={styles.marco}>
        <ul
          className={styles.pista}
          ref={pista}
          // Un contenedor que scrollea tiene que poder recibir el foco para
          // recorrerse con el teclado. Apilado ya no scrollea nada: sacarlo
          // del orden de tabulación evita una parada que no hace nada y un
          // anillo de foco alrededor de una columna de diez capturas.
          tabIndex={apilado ? -1 : 0}
          aria-label={`Capturas de ${proyecto}`}
          onKeyDown={teclasPista}
        >
          {capturas.map((captura, i) => (
            <li key={captura.id} className={styles.diapo} data-indice={i}>
              <button
                type="button"
                className={styles.abrir}
                onClick={() => setAmpliada(i)}
                aria-label={`Ampliar: ${captura.titulo}`}
                // En el carrusel solo la captura visible entra en el orden de
                // tabulación: con todas dentro, tabular arrastraría la tira de
                // punta a punta antes de dejar seguir leyendo la página.
                // Apiladas están todas a la vista, y saltear ocho sería raro.
                tabIndex={apilado || i === activa ? 0 : -1}
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
                  Ver la pantalla entera
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
          onClick={() => irA(activa - 1)}
          disabled={activa === 0}
          aria-label="Captura anterior"
        >
          <Chevron hacia="izquierda" />
        </button>
        <button
          type="button"
          className={`${styles.flecha} ${styles.siguiente}`}
          onClick={() => irA(activa + 1)}
          disabled={activa === total - 1}
          aria-label="Captura siguiente"
        >
          <Chevron hacia="derecha" />
        </button>
      </div>

      <div className={styles.puntos}>
        {capturas.map((captura, i) => (
          <button
            key={captura.id}
            type="button"
            className={styles.punto}
            onClick={() => irA(i)}
            aria-label={`Ver: ${captura.titulo}`}
            aria-current={i === activa || undefined}
          />
        ))}
      </div>

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
