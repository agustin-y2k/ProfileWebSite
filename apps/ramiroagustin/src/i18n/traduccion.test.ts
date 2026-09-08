import { describe, expect, it } from "vitest";
import { ALGORITMOS, type Definicion } from "../algoritmos/definiciones";
import { armar, ESCENARIOS as TABLEROS } from "../algoritmos/escenarios";
import type { Escena, ItemPanel, PasoEscena } from "../algoritmos/escena";
import type { Paso } from "../algoritmos/motor";
import { IDIOMAS, type Frase } from "./idioma";
import { bloqueMeta, META, RUTAS, type Pagina } from "./meta";

/**
 * La red que impide que una frase se quede a medio traducir.
 *
 * El sistema de idiomas permite escribir una cadena pelada donde el texto es
 * igual en los dos —un número, `SW-A`, `f = g + h`— y esa libertad es lo que
 * hace llevadero traducir mil frases. Pero es exactamente la misma libertad
 * que deja pasar una oración en español olvidada adentro de un motor: el
 * compilador la acepta, la página la muestra, y solo se descubre leyendo la
 * versión inglesa entera con los ojos.
 *
 * Así que acá se corren <b>todos</b> los algoritmos en <b>todos</b> sus
 * escenarios, se junta cada texto que puede llegar a la pantalla, y se le
 * exige a las cadenas peladas que no parezcan español. Es una heurística, y
 * como tal no puede probar que una traducción sea buena — pero sí atrapa lo
 * único que se escapa de verdad, que es la frase que nadie tradujo.
 */

/** Acentos, signos invertidos, y las palabras que no aparecen en inglés. */
const PALABRAS =
  /[áéíóúñ¿¡]|\b(el|la|los|las|un|una|unos|unas|de|del|que|con|sin|para|por|desde|hasta|entre|sobre|como|cuando|donde|porque|pero|todo|todos|toda|todas|cada|otro|otra|este|esta|estos|estas|ese|esa|esos|esas|su|sus|le|les|se|ya|hay|son|est[aá]|est[aá]n|era|fue|nodo|nodos|paso|pasos|arista|aristas|camino|caminos|clave|claves|grupo|grupos|punto|puntos|salto|saltos|vuelta|vueltas|nivel|niveles|raiz|costo|costos|peso|pesos|listo|listos|espera|cola|pila|centro|centros|error|jugada|jugadas|hoja|hojas|conectada|conectado|cortada|cortado|caida|caido|bloqueada|bloqueado|apaga|movidas|dispersion|iteracion|objetivo|candidatos|indice|vale|fuera|ninguno|ninguna|elemento|elementos|metrica|hondura|ronda|rondas|via|miradas|podadas|evaluar|aprendizaje|pendiente|pendientes|cerrado|cerrados|encontrado|primero|ultimo)\b/i;

/** Una cadena pelada solo es legítima si no parece una oración en español. */
const sospechosa = (frase: Frase) => typeof frase === "string" && PALABRAS.test(frase);

/** Junta todo lo que un paso puede llegar a mostrar, en un solo arreglo. */
const delPanel = (panel: ItemPanel[]): (Frase | undefined)[] =>
  panel.flatMap((i) => [i.clave, i.texto, i.nota]);

const deLaEscena = (e: Escena): (Frase | undefined)[] => {
  switch (e.tipo) {
    case "grafo":
      return [
        ...e.nodos.flatMap((n) => [n.nombre, n.etiqueta]),
        ...e.aristas.map((a) => a.peso),
      ];
    case "plano":
      return [...e.puntos.map((p) => p.nombre), e.ejes?.x, e.ejes?.y];
    case "arreglo":
      return e.punteros.map((p) => p.nombre);
    case "juego":
      return e.nodos.flatMap((n) => [n.etiqueta, n.ventana]);
  }
};

const deUnPaso = (p: PasoEscena): (Frase | undefined)[] => [
  p.texto,
  p.veredicto,
  ...delPanel(p.panel),
  ...deLaEscena(p.escena),
];

const deUnPasoDeGrilla = (p: Paso): (Frase | undefined)[] => [
  p.texto,
  ...p.frontera.map((f) => f.texto),
];

/** Cada algoritmo con cada uno de sus escenarios: todo lo que se puede ver. */
const corridas = (): [string, (Frase | undefined)[]][] =>
  ALGORITMOS.flatMap((a: Definicion) =>
    a.escenarios.map((e): [string, (Frase | undefined)[]] => [
      `${a.id} / ${e.id}`,
      a.familia === "grilla"
        ? a.correr(armar(TABLEROS.find((t) => t.id === e.id)!)).flatMap(deUnPasoDeGrilla)
        : a.correr(e.id).flatMap(deUnPaso),
    ]),
  );

describe("Ninguna frase se queda en español", () => {
  it("en lo que muestran los algoritmos mientras corren", () => {
    for (const [donde, frases] of corridas()) {
      const sueltas = frases
        .filter((f): f is Frase => f !== undefined)
        .filter(sospechosa);
      expect(sueltas, `${donde}: ${sueltas.join(" | ")}`).toEqual([]);
    }
  });

  it("en lo que cada algoritmo declara de sí mismo", () => {
    for (const a of ALGORITMOS) {
      const suyas = [
        a.nombre,
        a.panel,
        a.tesis,
        a.tambien,
        a.indice?.nombre,
        a.indice?.que,
        ...a.escenarios.map((e) => e.nombre),
      ].filter((f): f is Frase => f !== undefined);

      const sueltas = suyas.filter(sospechosa);
      expect(sueltas, `${a.id}: ${sueltas.join(" | ")}`).toEqual([]);
    }
  });

  it("y ninguna versión sale vacía", () => {
    const todas = corridas().flatMap(([, f]) => f);
    for (const frase of todas) {
      if (frase === undefined || typeof frase === "string") continue;
      for (const idioma of IDIOMAS) expect(frase[idioma].length).toBeGreaterThan(0);
    }
  });
});

describe("Los listados de código", () => {
  /**
   * Los pasos emiten un solo número de línea para los dos idiomas. Si una
   * versión tiene una línea de más, el resaltado apunta a otra cosa en ese
   * idioma — y eso no se ve leyendo el código, solo mirando la página traducida.
   */
  it("tienen la misma cantidad de líneas en los dos idiomas", () => {
    for (const a of ALGORITMOS) {
      expect(a.codigo.en.length, a.id).toBe(a.codigo.es.length);
    }
  });
});

describe("Las cabeceras", () => {
  const PAGINAS = Object.keys(RUTAS) as Pagina[];

  it("existen para cada página en cada idioma, y son distintas", () => {
    for (const pagina of PAGINAS) {
      for (const idioma of IDIOMAS) {
        const meta = META[pagina][idioma];
        expect(meta.titulo.length, `${pagina}/${idioma}`).toBeGreaterThan(0);
        expect(meta.descripcion.length, `${pagina}/${idioma}`).toBeGreaterThan(0);
      }
      expect(META[pagina].en.titulo).not.toBe(META[pagina].es.titulo);
      expect(META[pagina].en.descripcion).not.toBe(META[pagina].es.descripcion);
    }
  });

  it("declaran su canónica y las dos alternativas por idioma", () => {
    for (const pagina of PAGINAS) {
      for (const idioma of IDIOMAS) {
        const bloque = bloqueMeta(pagina, idioma);
        const suya = idioma === "es" ? RUTAS[pagina] : `/en${RUTAS[pagina]}`;

        expect(bloque, `${pagina}/${idioma}`).toContain(
          `rel="canonical" href="https://ramiroagustin.online${suya}"`,
        );
        for (const otro of IDIOMAS) {
          expect(bloque, `${pagina}/${idioma}`).toContain(`hreflang="${otro}"`);
        }
        // Sin x-default, el buscador no sabe qué servirle a quien no habla
        // ninguno de los dos.
        expect(bloque, `${pagina}/${idioma}`).toContain('hreflang="x-default"');
      }
    }
  });
});
