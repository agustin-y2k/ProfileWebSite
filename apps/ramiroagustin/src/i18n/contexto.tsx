import { createContext, useContext, type ReactNode } from "react";
import { PREDETERMINADO, t as resolver, type Frase, type Idioma } from "./idioma";

/**
 * El idioma de la página, para los componentes.
 *
 * Va por contexto y no por prop porque el idioma es del documento entero: se
 * fija una vez en el prerender y no cambia mientras la página está abierta
 * —cambiar de idioma es navegar a la otra URL, no re-renderizar—. Pasarlo a
 * mano por doce niveles de componentes sería ruido en cada firma para algo
 * que nunca varía dentro de un árbol.
 *
 * Los motores de los algoritmos no usan nada de esto: devuelven las dos
 * versiones de cada frase y el componente que las muestra elige. Así una
 * corrida sirve para los dos idiomas y no hay que re-ejecutar nada.
 */
const Contexto = createContext<Idioma>(PREDETERMINADO);

export function ProveedorIdioma({
  idioma,
  children,
}: {
  idioma: Idioma;
  children: ReactNode;
}) {
  return <Contexto.Provider value={idioma}>{children}</Contexto.Provider>;
}

export function useIdioma() {
  const idioma = useContext(Contexto);
  return { idioma, t: (frase: Frase) => resolver(idioma, frase) };
}

type Etiqueta = "p" | "h1" | "h2" | "h3" | "span" | "div" | "li" | "blockquote";

/**
 * Un bloque de texto con marcado adentro.
 *
 * Casi toda la prosa del sitio lleva un `<strong>` o un `<em>` en el medio, y
 * partirla en fragmentos para poder traducirla —«Soy», `<strong>`,
 * «programador», `</strong>`, «y estudiante…»— es el error clásico de la
 * internacionalización: el orden de las palabras cambia entre idiomas y los
 * pedazos dejan de encajar. Acá cada idioma trae la oración entera con su
 * marcado, que es la única forma de que las dos suenen naturales.
 *
 * El HTML es literal nuestro, escrito en los archivos de copia de este mismo
 * repositorio. No hay entrada de usuario en el camino, que es la condición
 * que hace aceptable `dangerouslySetInnerHTML` — la misma que ya se cumple en
 * las narraciones del visualizador.
 */
export function Prosa({
  frase,
  as: Como = "p",
  className,
  id,
}: {
  frase: Frase;
  as?: Etiqueta;
  className?: string;
  id?: string;
}) {
  const { t } = useIdioma();
  return (
    <Como id={id} className={className} dangerouslySetInnerHTML={{ __html: t(frase) }} />
  );
}
