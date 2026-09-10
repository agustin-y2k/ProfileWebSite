import { describe, expect, it } from "vitest";
import { armar, LABERINTOS, TERRENOS } from "./escenarios";
import { correrAEstrella, correrBFS, correrDFS, costoOptimo, type Paso } from "./motor";

/**
 * Cada escenario existe para que la página pueda afirmar algo. «El rodeo» dice
 * que el camino más barato esquiva el barro; «La bifurcación» dice que DFS trae
 * un camino ocho casillas más largo que el corto. Esas frases están escritas en
 * la interfaz, así que son afirmaciones sobre estos tableros — y si alguien
 * mueve un bloque de barro dos columnas, dejan de ser ciertas sin que nada
 * falle.
 *
 * Los dos juegos se prueban por separado a propósito: los terrenos con costo
 * son de A* y los laberintos son de BFS y DFS. Correr un algoritmo sobre el
 * tablero del otro no probaría nada — es justamente la mezcla que se sacó.
 *
 * Esto no prueba que los algoritmos estén bien: prueba que los tableros siguen
 * demostrando lo que la página dice que demuestran.
 */

const resumen = (pasos: Paso[]) => pasos[pasos.length - 1]!.resumen!;
const tablero = (id: string) =>
  armar([...TERRENOS, ...LABERINTOS].find((e) => e.id === id)!);

// ── Los terrenos con costo, que son de A* ────────────────────────────────

describe("El rodeo", () => {
  const terreno = tablero("rodeo");

  it("el camino más barato esquiva el barro por completo", () => {
    const r = resumen(correrAEstrella(terreno));
    expect(r.barro).toBe(0);
    expect(r.costo).toBe(22);
    expect(costoOptimo(terreno)).toBe(22);
  });
});

describe("El atajo caro", () => {
  const terreno = tablero("atajo");

  it("el camino más barato cruza el barro en vez de rodearlo", () => {
    const r = resumen(correrAEstrella(terreno));
    expect(r.barro).toBe(1);
    expect(r.costo).toBe(19);
    expect(costoOptimo(terreno)).toBe(19);
  });
});

describe("A*", () => {
  it("devuelve el mínimo mientras la heurística no se pase", () => {
    for (const esc of TERRENOS) {
      if (esc.id === "corazonada") continue; // ese escenario existe para romperlo

      const terreno = armar(esc);

      // La garantía que la página afirma: si A* devolviera un camino peor, la
      // heurística habría dejado de ser admisible.
      expect(resumen(correrAEstrella(terreno, esc.id)).costo, esc.id).toBe(
        costoOptimo(terreno),
      );
    }
  });
});

describe("La corazonada exagerada", () => {
  const terreno = tablero("corazonada");

  it("es el mismo tablero que «El rodeo», casilla por casilla", () => {
    // La moraleja depende de eso: lo único que cambia entre los dos escenarios
    // es cuánto se le cree a la heurística. Si los tableros se separan, la
    // comparación deja de ser consigo mismo y no dice nada.
    expect(terreno).toEqual(tablero("rodeo"));
  });

  it("llega más rápido y con un camino peor, y no puede notarlo", () => {
    const prudente = resumen(correrAEstrella(terreno, "rodeo"));
    const exagerada = resumen(correrAEstrella(terreno, "corazonada"));

    // Las dos mitades del canje. La primera: el camino ya no es el mínimo.
    expect(prudente.costo).toBe(costoOptimo(terreno));
    expect(exagerada.costo!).toBeGreaterThan(costoOptimo(terreno)!);

    // La segunda: a cambio abre bastante menos tablero. Si algún día deja de
    // ahorrar, el escenario perdió la mitad de su gracia.
    expect(exagerada.expandidas).toBeLessThan(prudente.expandidas);

    // Y el detalle que se ve en pantalla: va derecho por el barro que el
    // camino barato rodea entero.
    expect(prudente.barro).toBe(0);
    expect(exagerada.barro).toBeGreaterThan(0);
  });
});

// ── Los laberintos, que son de BFS y DFS ─────────────────────────────────

describe("Los laberintos", () => {
  it("no tienen ni un solo costo que mirar", () => {
    // Es la razón de que existan. Si alguien vuelve a meter barro acá, la
    // narración de BFS y DFS empieza otra vez a hablar de algo que no usan.
    for (const esc of LABERINTOS) {
      const t = armar(esc);
      expect(
        t.every((c) => c === "libre" || c === "muro"),
        esc.id,
      ).toBe(true);
    }
  });
});

describe("La sala abierta", () => {
  const terreno = tablero("sala");

  it("DFS acierta a la primera y BFS abre casi todo el tablero", () => {
    const bfs = resumen(correrBFS(terreno));
    const dfs = resumen(correrDFS(terreno));

    // La moraleja: sin una sola pared que lo desvíe, la pila dispara en línea
    // recta y llega óptimo abriendo quince casillas. No es mérito del
    // algoritmo, es el orden en que se apilan los vecinos.
    expect(dfs.largo).toBe(15);
    expect(dfs.expandidas).toBe(15);
    expect(bfs.largo).toBe(15);
    expect(bfs.expandidas).toBeGreaterThan(100);
  });
});

describe("La bifurcación", () => {
  const terreno = tablero("bifurcacion");

  it("DFS trae el camino largo, y encima abriendo menos casillas", () => {
    const bfs = resumen(correrBFS(terreno));
    const dfs = resumen(correrDFS(terreno));

    // Las dos mitades de la moraleja. La primera: el camino de DFS es ocho
    // casillas más largo que el corto, porque la pila saca el vecino de abajo
    // antes que el de arriba.
    expect(bfs.largo).toBe(17);
    expect(dfs.largo).toBe(25);

    // La segunda, que es la que sorprende: abrió MENOS tablero que BFS y aun
    // así contestó peor. Mirar poco no es lo mismo que contestar bien.
    expect(dfs.expandidas).toBeLessThan(bfs.expandidas);
  });
});

describe("El destino tapiado", () => {
  const terreno = tablero("sellado");

  it("ninguno llega, y los dos agotan lo alcanzable para poder decirlo", () => {
    expect(costoOptimo(terreno)).toBeNull();

    for (const correr of [correrBFS, correrDFS]) {
      const r = resumen(correr(terreno));
      expect(r.costo).toBeNull();
      expect(r.expandidas).toBe(182);
    }
  });
});
