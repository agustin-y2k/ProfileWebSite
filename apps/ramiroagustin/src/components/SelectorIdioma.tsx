import { VisuallyHidden } from "@sites/ui";
import { useIdioma } from "../i18n/contexto";
import { alternar, COOKIE_IDIOMA, NOMBRE_IDIOMA, ruta } from "../i18n/idioma";
import { RUTAS, type Pagina } from "../i18n/meta";
import styles from "./SelectorIdioma.module.css";

const UN_ANIO = 60 * 60 * 24 * 365;

/**
 * El cambio de idioma es un enlace de verdad, no un botón que reescribe la
 * página.
 *
 * Como cada idioma tiene su URL prerenderizada, cambiar de idioma es navegar:
 * el enlace se puede abrir en otra pestaña, copiar y compartir, y funciona sin
 * JavaScript. Un botón que intercambiara los textos en el cliente dejaría a
 * las dos versiones compartiendo una sola dirección, que es justo lo que el
 * `hreflang` intenta evitar.
 *
 * Lo único que necesita JavaScript es recordar la elección, y esa parte
 * degrada bien: sin él la persona igual llega a la página que pidió, solo que
 * la próxima visita vuelve a decidirse por el idioma del navegador.
 */
export function SelectorIdioma({ pagina }: { pagina: Pagina }) {
  const { idioma, t } = useIdioma();
  const otro = alternar(idioma);

  // nginx lee esta cookie antes que Accept-Language. Sin ella, alguien con el
  // navegador en inglés que elige español volvería al inglés en la próxima
  // visita y el selector sería decorativo.
  const recordar = () => {
    document.cookie = `${COOKIE_IDIOMA}=${otro}; path=/; max-age=${UN_ANIO}; samesite=lax`;
  };

  const etiqueta = t({
    es: `Ver esta página en ${NOMBRE_IDIOMA[otro]}`,
    en: `View this page in ${NOMBRE_IDIOMA[otro]}`,
  });

  return (
    <a
      className={styles.selector}
      href={ruta(otro, RUTAS[pagina])}
      onClick={recordar}
      // `hreflang` y `lang` van los dos: el primero declara el idioma del
      // destino y el segundo el de la etiqueta, para que un lector de pantalla
      // pronuncie «English» en inglés y no leyéndolo como si fuera español.
      hrefLang={otro}
      lang={otro}
      title={etiqueta}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M3.2 9.5h17.6M3.2 14.5h17.6M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <span aria-hidden="true">{otro.toUpperCase()}</span>
      <VisuallyHidden>{etiqueta}</VisuallyHidden>
    </a>
  );
}
