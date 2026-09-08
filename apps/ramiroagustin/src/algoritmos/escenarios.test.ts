import { describe, expect, it } from "vitest";
import { armar, ESCENARIOS } from "./escenarios";
import {
  correrAEstrella,
  correrBFS,
  correrDFS,
  correrDijkstra,
  type Paso,
} from "./motor";

/**
 * Cada escenario existe para que la página pueda afirmar algo. «El rodeo» dice
 * que el camino más barato esquiva el barro; «El atajo caro» dice lo contrario.
 * Esas frases están escritas en la interfaz, así que son afirmaciones sobre
 * estos tableros — y si alguien mueve un bloque de barro dos columnas, dejan de
 * ser ciertas sin que nada falle.
 *
 * Esto no prueba que los algoritmos estén bien: prueba que los tableros siguen
 * demostrando lo que la página dice que demuestran.
 */

const resumen = (pasos: Paso[]) => pasos[pasos.length - 1]!.resumen!;
const escenario = (id: string) => armar(ESCENARIOS.find((e) => e.id === id)!);

describe("El rodeo", () => {
  const terreno = escenario("rodeo");

  it("el camino más barato esquiva el barro por completo", () => {
    const r = resumen(correrDijkstra(terreno));
    expect(r.barro).toBe(0);
    expect(r.costo).toBe(22);
  });

  it("BFS encuentra menos casillas y termina costando el doble", () => {
    const optimo = resumen(correrDijkstra(terreno));
    const bfs = resumen(correrBFS(terreno));

    // Es la moraleja al revés: corto no es barato.
    expect(bfs.largo).toBeLessThan(optimo.largo!);
    expect(bfs.costo!).toBeGreaterThan(optimo.costo!);
    expect(bfs.barro).toBeGreaterThan(0);
  });
});

describe("El atajo caro", () => {
  const terreno = escenario("atajo");

  it("el camino más barato cruza el barro en vez de rodearlo", () => {
    const r = resumen(correrDijkstra(terreno));
    expect(r.barro).toBe(1);
    expect(r.costo).toBe(19);
  });
});

describe("Empate", () => {
  const terreno = escenario("empate");

  it("sin costos que ordenar, Dijkstra y BFS hacen exactamente lo mismo", () => {
    const dij = resumen(correrDijkstra(terreno));
    const bfs = resumen(correrBFS(terreno));

    // La frase que la página afirma: Dijkstra ES BFS cuando todo cuesta igual.
    // Si algún día el escenario deja de ser uniforme, esto se cae.
    expect(bfs.costo).toBe(dij.costo);
    expect(bfs.largo).toBe(dij.largo);
    expect(bfs.expandidas).toBe(dij.expandidas);
  });
});

describe("Sin salida", () => {
  const terreno = escenario("sinsalida");

  it("ninguno llega, y todos tienen que agotar lo alcanzable para saberlo", () => {
    for (const correr of [correrDijkstra, correrAEstrella, correrBFS, correrDFS]) {
      const r = resumen(correr(terreno));
      expect(r.costo).toBeNull();
      expect(r.expandidas).toBe(182);
    }
  });
});

describe("A*", () => {
  it("encuentra el mismo óptimo que Dijkstra, abriendo menos tablero", () => {
    for (const esc of ESCENARIOS) {
      const terreno = armar(esc);
      const dij = resumen(correrDijkstra(terreno));
      const estrella = resumen(correrAEstrella(terreno));

      // Lo primero es la garantía: si A* devolviera un camino peor, la
      // heurística habría dejado de ser admisible y la comparación sería
      // tramposa. Lo segundo es la ventaja, y solo aplica si hay camino.
      expect(estrella.costo).toBe(dij.costo);
      if (dij.costo !== null) {
        expect(estrella.expandidas).toBeLessThan(dij.expandidas);
      }
    }
  });
});
