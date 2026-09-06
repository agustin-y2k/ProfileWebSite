import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useLockBodyScroll } from "@sites/ui";
import type { Captura, Juego } from "../data/capturas";
import styles from "./Galeria.module.css";

/** Ancho de render de la captura. De 62rem para arriba es la columna derecha
 *  del recorrido: el contenedor menos su gutter, el padding de la tarjeta, la
 *  columna del texto y el espacio entre las dos, con tope cuando el contenedor
 *  deja de crecer. Debajo es el ancho útil de la tarjeta. */
const MEDIDAS_TARJETA =
  "(min-width: 90rem) 912px, (min-width: 62rem) calc(100vw - 528px), calc(100vw - 6rem)";

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
 * El recorrido por las capturas del sistema, más una lupa que muestra la
 * pantalla entera.
 *
 * El recorrido es una lista y nada más: cada captura con el pie que la
 * explica, una debajo de la otra. Que en escritorio se vean de a una por
 * pantalla, con el texto al lado y las dos pegadas mientras se las recorre, lo
 * resuelve el CSS —ver Galeria.module.css—, así que sin JavaScript la página
 * se lee igual y no hay nada escondido detrás de un control. Lo único que
 * necesita JavaScript acá es la lupa.
 *
 * Antes esto era un carrusel. Escondía nueve de las diez capturas detrás de
 * una flecha, y en un teléfono ni siquiera aparecía la flecha.
 */
export function Galeria({ capturas, proyecto }: GaleriaProps) {
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);

  const lista = useRef<HTMLUListElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  /** Última captura vista en la lupa: al cerrar, la página vuelve ahí. */
  const ultima = useRef(0);

  useLockBodyScroll(ampliada !== null);

  const total = capturas.length;

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

  const enLupa = ampliada === null ? undefined : capturas[ampliada];
  if (total === 0) return null;

  return (
    <>
      <ul className={styles.pista} ref={lista} aria-label={`Capturas de ${proyecto}`}>
        {capturas.map((captura, i) => (
          <li key={captura.id} className={styles.diapo}>
            <button
              type="button"
              className={styles.abrir}
              onClick={() => setAmpliada(i)}
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
    </>
  );
}
