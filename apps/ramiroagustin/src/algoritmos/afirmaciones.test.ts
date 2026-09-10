import { describe, expect, it } from "vitest";
import { t, type Frase } from "../i18n/idioma";
import type { EscenaArreglo, EscenaGrafo, EscenaJuego, PasoEscena } from "./escena";
import { correrDijkstra } from "./dijkstra";
import { correrSpanning } from "./spanning";
import { correrBellmanFord } from "./bellmanford";
import { correrHashing } from "./hashing";
import { correrTopologico } from "./topologico";
import { correrBinaria } from "./binaria";
import { correrUnionFind } from "./unionfind";
import { correrMinimax } from "./minimax";
import { correrGradiente } from "./gradiente";
import { correrKMeans } from "./kmeans";

/**
 * Igual que escenarios.test.ts, y por el mismo motivo: cada escenario existe
 * para que la página pueda afirmar algo, y esas frases están escritas en la
 * interfaz. «Se movió solo el 25% de las claves» y «la poda mira la mitad de
 * las hojas» son afirmaciones sobre estas corridas.
 *
 * Esto no prueba que los algoritmos estén bien implementados: prueba que los
 * escenarios siguen demostrando lo que la página dice que demuestran. Si
 * alguien mueve un enlace de lugar o cambia un valor de una hoja, las moralejas
 * dejarían de ser ciertas sin que nada más falle.
 */

/**
 * Las corridas devuelven `Frase`, no cadenas: cada texto trae sus dos idiomas.
 *
 * Estas pruebas leen la versión española y solo la española. No es una omisión:
 * lo que verifican son los NÚMEROS que la corrida produjo —cuántas claves se
 * movieron, a qué x convergió— y esos son los mismos en los dos idiomas por
 * construcción, porque una sola corrida llena las dos versiones. Probar el
 * inglés aparte sería probar dos veces la misma cuenta. Que ninguna frase se
 * quede sin traducir lo cubre la última prueba del archivo, que sí mira las dos.
 */
const es = (frase: Frase | undefined) => (frase === undefined ? "" : t("es", frase));

const ultimo = (pasos: PasoEscena[]) => pasos[pasos.length - 1]!;
const grafo = (pasos: PasoEscena[]) => ultimo(pasos).escena as EscenaGrafo;
const panel = (pasos: PasoEscena[], clave: string) =>
  ultimo(pasos).panel.find((p) => es(p.clave) === clave);

/** Todos los pasos apuntan a una línea que existe en el listado que se muestra. */
const lineasSanas = (pasos: PasoEscena[], listado: number) =>
  pasos.every((p) => p.linea >= 0 && p.linea <= listado);

/** Una corrida de cada uno, con el largo de su listado de código. */
const TODOS: [PasoEscena[], number, string][] = [
  [correrDijkstra("spf"), 25, "dijkstra"],
  [correrDijkstra("anchodebanda"), 25, "dijkstra · ancho de banda"],
  [correrDijkstra("desincronizado"), 25, "dijkstra · mapa viejo"],
  [correrSpanning("prioridad"), 20, "spanning"],
  [correrBellmanFord("cuenta"), 17, "bellman-ford"],
  [correrHashing("caida"), 17, "hashing"],
  [correrTopologico("repo"), 23, "topológico"],
  [correrBinaria("esta"), 15, "binaria"],
  [correrUnionFind("compresion"), 18, "union-find"],
  [correrMinimax("poda"), 21, "minimax"],
  [correrGradiente("justo"), 13, "gradiente"],
  [correrKMeans("natural"), 18, "k-means"],
];

describe("Dijkstra", () => {
  /** La tabla de ruteo que quedó: destino → costo y primer salto. */
  const tabla = (pasos: PasoEscena[]) =>
    new Map(
      ultimo(pasos).panel.map((p) => [
        es(p.clave),
        { texto: es(p.texto), nota: es(p.nota) },
      ]),
    );

  it("cierra todos los destinos, no solo uno", () => {
    // La moraleja de la página: SPF no busca un camino, llena la tabla. Si
    // algún día se le colara un corte anticipado, faltarían renglones.
    const t = tabla(correrDijkstra("spf"));

    expect([...t.keys()].sort()).toEqual(["R2", "R3", "R4", "R5", "R6"]);
    expect([...t.values()].every((v) => v.texto.startsWith("PATH"))).toBe(true);
  });

  it("cada destino queda con el costo mínimo y su primer salto", () => {
    const t = tabla(correrDijkstra("spf"));

    for (const [destino, costo, salto] of [
      ["R2", 1, "R2"],
      ["R3", 2, "R3"],
      ["R4", 5, "R2"],
      ["R5", 3, "R3"],
      ["R6", 7, "R2"],
    ] as const) {
      expect(t.get(destino)!.texto, destino).toBe(`PATH · costo ${costo}`);
      expect(t.get(destino)!.nota, destino).toBe(`sale por ${salto}`);
    }
  });

  it("R6 figura primero en 9 y recién después baja a 7", () => {
    // El veredicto afirma exactamente esto: un destino no está resuelto hasta
    // que sale de TENT, por más número que tenga escrito.
    const pasos = correrDijkstra("spf");
    const deR6 = pasos
      .map((p) => p.panel.find((i) => es(i.clave) === "R6"))
      .filter((i) => i !== undefined)
      .map((i) => es(i.texto));

    expect(deR6).toContain("TENT · costo 9");
    expect(deR6[deR6.length - 1]).toBe("PATH · costo 7");
    expect(deR6.indexOf("TENT · costo 9")).toBeLessThan(deR6.indexOf("TENT · costo 7"));
  });

  it("con el costo por ancho de banda, el tráfico se va por los 100 Mbps", () => {
    const pasos = correrDijkstra("anchodebanda");
    const t = tabla(pasos);

    // R1–R3–R6 son dos enlaces de 100M; R1–R2–R4–R6, tres de 10G. Gana el
    // corto porque con el reference-bandwidth de fábrica todos cuestan 1.
    expect(t.get("R6")!.nota).toBe("sale por R3");
    expect(t.get("R6")!.texto).toBe("PATH · costo 2");

    // Y la razón: con el reference-bandwidth de fábrica, los nueve cables
    // cuestan lo mismo por más que uno mueva cien veces más que otro.
    const enlaces = (ultimo(pasos).escena as EscenaGrafo).aristas;
    expect(enlaces.every((a) => es(a.peso).endsWith("·1"))).toBe(true);
  });

  it("con el mapa viejo, calcula sobre un enlace que ya no existe", () => {
    const pasos = correrDijkstra("desincronizado");

    // El cable R3–R5 está caído y R1 no se enteró: lo usa igual, y por eso
    // la ruta a R5 sale por R3. Ese es el bucle que cuenta el veredicto.
    expect(tabla(pasos).get("R5")!.nota).toBe("sale por R3");

    const caido = (ultimo(pasos).escena as EscenaGrafo).aristas.find(
      (a) => (a.a === "R3" && a.b === "R5") || (a.a === "R5" && a.b === "R3"),
    );
    expect(es(caido!.peso)).toContain("caído");
    expect(caido!.estado).toBe("tenue");
  });
});

describe("Spanning Tree", () => {
  /** Un grafo sin bucles y conexo: exactamente lo que STP tiene que dejar. */
  const esArbol = (e: EscenaGrafo) => {
    const activas = e.aristas.filter(
      (a) => a.estado === "arbol" || a.estado === "normal",
    );
    const padre = new Map(e.nodos.map((n) => [n.id, n.id]));
    const raiz = (x: string): string => (padre.get(x) === x ? x : raiz(padre.get(x)!));

    for (const a of activas) {
      const ra = raiz(a.a);
      const rb = raiz(a.b);
      if (ra === rb) return { arbol: false, activas: activas.length };
      padre.set(rb, ra);
    }
    const componentes = new Set(e.nodos.map((n) => raiz(n.id)));
    return { arbol: componentes.size === 1, activas: activas.length };
  };

  it("deja exactamente un camino entre cualquier par de switches", () => {
    for (const escenario of ["prioridad", "sinprioridad", "caida"]) {
      const e = grafo(correrSpanning(escenario));
      const r = esArbol(e);

      // Sin bucles y sin islas. Las dos mitades importan: apagar todo también
      // rompe los bucles, y sería un desastre.
      expect(r.arbol, escenario).toBe(true);
      expect(r.activas, escenario).toBe(5); // 6 switches → 5 enlaces
    }
  });

  it("con la prioridad de fábrica, la raíz la termina eligiendo la MAC", () => {
    const conPrioridad = grafo(correrSpanning("prioridad"));
    const sinPrioridad = grafo(correrSpanning("sinprioridad"));

    const raizDe = (e: EscenaGrafo) =>
      e.nodos.find((n) => es(n.etiqueta) === "raíz · 0")!.id;

    // La frase de la página: configurar la prioridad es lo único que decide
    // dónde queda el centro de la red.
    expect(raizDe(conPrioridad)).toBe("B");
    expect(raizDe(sinPrioridad)).toBe("F");
    expect(raizDe(conPrioridad)).not.toBe(raizDe(sinPrioridad));
  });

  it("al caerse un enlace, entra en servicio un puerto que estaba bloqueado", () => {
    const estadoDe = (escenario: string, a: string, b: string) =>
      grafo(correrSpanning(escenario)).aristas.find((x) => x.a === a && x.b === b)!
        .estado;

    // Es lo que el veredicto afirma, y es la razón de ser de los puertos
    // apagados: no son cable desperdiciado, son el plan B.
    expect(estadoDe("prioridad", "E", "F")).toBe("apagada");
    expect(estadoDe("caida", "E", "F")).toBe("arbol");
  });
});

describe("Bellman-Ford", () => {
  const metricas = (escenario: string) =>
    grafo(correrBellmanFord(escenario))
      .nodos.filter((n) => n.id !== "LAN")
      .map((n) => es(n.etiqueta));

  it("aprende la red en una ronda por salto", () => {
    const pasos = correrBellmanFord("converge");
    // Cinco routers, cuatro saltos: la información avanza uno por ronda.
    expect(es(ultimo(pasos).veredicto)).toContain("<b>4</b> rondas");
    expect(metricas("converge")).toEqual([
      "4 vía R2",
      "3 vía R3",
      "2 vía R4",
      "1 vía R5",
      "conectada",
    ]);
  });

  it("sin split horizon, la métrica trepa hasta el techo en vez de saltar a ∞", () => {
    const pasos = correrBellmanFord("cuenta");
    const conSplit = correrBellmanFord("splithorizon");

    // Todos terminan aceptando que la red no está...
    expect(metricas("cuenta").slice(0, 4)).toEqual(["∞", "∞", "∞", "∞"]);
    expect(metricas("splithorizon").slice(0, 4)).toEqual(["∞", "∞", "∞", "∞"]);

    // ...pero uno tarda muchísimo más, y esa es la moraleja entera.
    expect(pasos.length).toBeGreaterThan(conSplit.length * 2);
  });

  it("la cuenta pasa por métricas inventadas que nunca existieron", () => {
    // Si esto dejara de pasar, la página estaría explicando un problema que su
    // propia simulación ya no tiene.
    const intermedias = correrBellmanFord("cuenta").flatMap((p) =>
      (p.escena as EscenaGrafo).nodos.map((n) => es(n.etiqueta)),
    );
    expect(intermedias.some((e) => es(e).startsWith("7 vía"))).toBe(true);
    expect(intermedias.some((e) => es(e).startsWith("11 vía"))).toBe(true);
  });
});

describe("Orden topológico", () => {
  const orden = (escenario: string) =>
    grafo(correrTopologico(escenario))
      .nodos.filter((n) => es(n.etiqueta).endsWith("º"))
      .sort((a, b) => parseInt(es(a.etiqueta)) - parseInt(es(b.etiqueta)))
      .map((n) => n.id);

  const DEPENDENCIAS: [string, string][] = [
    ["tokens", "ui"],
    ["tokens", "ramiro"],
    ["tokens", "bytefix"],
    ["ui", "ramiro"],
    ["ui", "bytefix"],
    ["negocio", "bytefix"],
    ["negocio", "taller"],
  ];

  const valido = (lista: string[]) =>
    DEPENDENCIAS.every(([de, a]) => lista.indexOf(de) < lista.indexOf(a));

  it("emite cada paquete después de todo lo que necesita", () => {
    const conCola = orden("repo");
    expect(conCola).toHaveLength(6);
    expect(valido(conCola)).toBe(true);
  });

  it("una pila da otro orden, y también es correcto", () => {
    const conPila = orden("pila");
    expect(conPila).toHaveLength(6);
    expect(valido(conPila)).toBe(true);

    // La afirmación del veredicto: el orden topológico casi nunca es único, y
    // esa libertad es la que permite compilar en paralelo.
    expect(conPila).not.toEqual(orden("repo"));
  });

  it("con un ciclo se queda sin candidatos y sobran paquetes", () => {
    const roto = orden("ciclo");
    expect(roto.length).toBeLessThan(6);
    expect(roto).not.toContain("ui");
    expect(roto).not.toContain("negocio");
    expect(es(ultimo(correrTopologico("ciclo")).veredicto)).toContain("el ciclo es");
  });
});

describe("Búsqueda binaria", () => {
  const arreglo = (pasos: PasoEscena[]) => ultimo(pasos).escena as EscenaArreglo;

  it("descarta la mitad en cada vuelta", () => {
    const pasos = correrBinaria("esta");
    const hallada = arreglo(pasos).celdas.filter((c) => c.estado === "hallada");

    expect(hallada).toHaveLength(1);
    expect(hallada[0]!.valor).toBe(88);
    // 32 elementos entran en log₂(32) = 5 vueltas. Si alguna vez hicieran
    // falta más, es que el algoritmo dejó de partir por la mitad.
    expect(es(ultimo(pasos).veredicto)).toContain("<b>5</b> vueltas");
  });

  it("sobre un arreglo mal ordenado contesta «no está» con el valor adentro", () => {
    const pasos = correrBinaria("desordenado");
    const celdas = arreglo(pasos).celdas;

    // Las dos mitades de la moraleja: el 88 está...
    expect(celdas.some((c) => c.valor === 88)).toBe(true);
    // ...y aun así no lo encuentra.
    expect(celdas.some((c) => c.estado === "hallada")).toBe(false);
  });
});

describe("Union-Find", () => {
  /** Hondura del bosque leída del dibujo, que es lo que se ve en pantalla. */
  const hondura = (escenario: string) => {
    const e = grafo(correrUnionFind(escenario));
    const padre = new Map(e.aristas.map((a) => [a.a, a.b]));
    const alto = (x: string) => {
      let d = 0;
      let cur = x;
      while (padre.has(cur)) {
        cur = padre.get(cur)!;
        d++;
      }
      return d;
    };
    return Math.max(...e.nodos.map((n) => alto(n.id)));
  };

  it("sin unión por tamaño, el árbol degenera en una fila india", () => {
    expect(hondura("ingenuo")).toBe(7); // ocho elementos, uno atrás del otro
  });

  it("la unión por tamaño lo mantiene en log₂(n)", () => {
    expect(hondura("tamano")).toBeLessThanOrEqual(3);
  });

  it("la compresión de caminos lo deja plano", () => {
    // La frase del veredicto: la compresión aplana el camino que se caminó,
    // no el bosque entero. Por eso baja de 3 a 2 y no a 1.
    expect(hondura("compresion")).toBeLessThan(hondura("tamano"));
    expect(hondura("compresion")).toBe(2);
  });
});

describe("Minimax con poda alfa-beta", () => {
  const hojas = (escenario: string) => {
    const p = panel(correrMinimax(escenario), "hojas miradas")!;
    return parseInt(es(p.texto));
  };
  const elegida = (escenario: string) =>
    (ultimo(correrMinimax(escenario)).escena as EscenaJuego).nodos.find(
      (n) => n.id === "raiz",
    )!.etiqueta;

  it("la poda no cambia la jugada: solo el trabajo", () => {
    // Es la afirmación más fuerte de la página sobre alfa-beta, y la que la
    // separa de una heurística. Si esto se cayera, la poda estaría rota.
    expect(elegida("poda")).toBe(elegida("sinpoda"));
    expect(elegida("malorden")).toBe(elegida("sinpoda"));
  });

  it("con buen orden mira la mitad de las hojas", () => {
    expect(hojas("sinpoda")).toBe(9);
    expect(hojas("poda")).toBe(5);
  });

  it("con el peor orden no ahorra nada, aunque la poda esté activada", () => {
    expect(hojas("malorden")).toBe(9);
  });
});

describe("Descenso de gradiente", () => {
  const donde = (escenario: string) => es(panel(correrGradiente(escenario), "x")!.texto);

  it("con el paso justo llega al valle más hondo", () => {
    expect(parseFloat(donde("justo"))).toBeCloseTo(-4.61, 1);
  });

  it("arrancando del otro lado se queda en un mínimo local, y no lo sabe", () => {
    const x = parseFloat(donde("local"));
    expect(x).toBeGreaterThan(2);
    expect(x).toBeLessThan(3.5);
    expect(es(ultimo(correrGradiente("local")).veredicto)).toContain("no es el mínimo");
  });

  it("con el paso demasiado grande no aprende: se va", () => {
    expect(es(ultimo(correrGradiente("grande")).veredicto)).toContain("no aprendió nada");
  });
});

describe("k-means", () => {
  const tamanos = (escenario: string) =>
    ultimo(correrKMeans(escenario))
      .panel.filter((p) => es(p.clave).startsWith("grupo"))
      .map((p) => parseInt(es(p.texto)))
      .sort((a, b) => a - b);

  const dispersion = (escenario: string) =>
    parseFloat(es(panel(correrKMeans(escenario), "dispersión")!.texto));

  it("con un arranque razonable encuentra las tres nubes", () => {
    // Las nubes son de 14, 13 y 13 puntos: si los recupera, agrupó bien.
    expect(tamanos("natural")).toEqual([13, 13, 14]);
  });

  it("con un arranque desafortunado converge igual, pero a un reparto peor", () => {
    expect(tamanos("malarranque")).not.toEqual([13, 13, 14]);
    expect(dispersion("malarranque")).toBeGreaterThan(dispersion("natural"));
  });

  it("si le piden dos grupos, devuelve dos grupos sin protestar", () => {
    expect(tamanos("kdos")).toHaveLength(2);
  });
});

describe("Hashing consistente", () => {
  const movidas = (escenario: string) =>
    parseInt(es(panel(correrHashing(escenario), "claves movidas")!.texto));

  it("al caerse un servidor se mueve solo lo que era de ese servidor", () => {
    // La promesa del método: 1/N. Con cuatro servidores y 24 claves, un cuarto.
    const n = movidas("caida");
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(9);
  });

  it("dividiendo por N se mueve muchísimo más que lo que se cayó", () => {
    expect(movidas("modulo")).toBeGreaterThan(movidas("caida") * 2);
  });

  it("sin nodos virtuales el reparto queda torcido", () => {
    const carga = ultimo(correrHashing("sinvirtuales"))
      .panel.filter((p) => es(p.nota).includes("carga"))
      .map((p) => parseInt(es(p.texto)));
    const conVirtuales = ultimo(correrHashing("caida"))
      .panel.filter((p) => es(p.nota).includes("carga"))
      .map((p) => parseInt(es(p.texto)));

    // La moraleja: el que hereda el tramo del caído se lo come entero.
    expect(Math.max(...carga)).toBeGreaterThan(Math.max(...conVirtuales));
  });
});

describe("Las escenas", () => {
  /**
   * Un NaN en una coordenada no rompe nada: el SVG dibuja la figura en
   * cualquier parte, o no la dibuja, y no hay error en ninguna consola. Es el
   * tipo de falla que solo se ve mirando, así que conviene que falle acá.
   */
  const finito = (n: number) => Number.isFinite(n);

  it("ninguna coordenada es NaN ni infinita", () => {
    const todas = TODOS.flatMap(([pasos]) => pasos.map((p) => p.escena));

    for (const e of todas) {
      if (e.tipo === "grafo" || e.tipo === "juego") {
        expect(e.nodos.every((n) => finito(n.x) && finito(n.y))).toBe(true);
        const ids = new Set(e.nodos.map((n) => n.id));
        // Una arista hacia un nodo que no está en la escena se dibuja como
        // nada: no falla, simplemente falta.
        expect(e.aristas.every((a) => ids.has(a.a) && ids.has(a.b))).toBe(true);
      } else if (e.tipo === "plano") {
        expect(e.puntos.every((p) => finito(p.x) && finito(p.y))).toBe(true);
        expect(
          e.curvas.every((c) => c.puntos.every((p) => finito(p.x) && finito(p.y))),
        ).toBe(true);
      } else {
        expect(e.punteros.every((p) => p.indice >= 0 && p.indice < e.celdas.length)).toBe(
          true,
        );
      }
    }
  });

  it("todos los pasos tienen algo que contar", () => {
    for (const [pasos, , nombre] of TODOS) {
      expect(pasos.length, nombre).toBeGreaterThan(3);
      expect(
        pasos.every((p) => es(p.texto).trim().length > 0),
        nombre,
      ).toBe(true);
      // El veredicto es la moraleja con los números de la corrida: va al
      // final, y solo al final.
      expect(
        pasos.filter((p) => p.veredicto),
        nombre,
      ).toHaveLength(1);
      expect(ultimo(pasos).veredicto, nombre).toBeTruthy();
    }
  });
});

describe("Los listados de código", () => {
  it("ningún paso resalta una línea que no existe", () => {
    for (const [pasos, listado, nombre] of TODOS) {
      expect(lineasSanas(pasos, listado), nombre).toBe(true);
    }
  });
});
