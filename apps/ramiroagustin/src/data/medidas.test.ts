import { describe, expect, it } from "vitest";
import medidas from "./medidas.json";

/*
 * Lo que se fija acá no es código sino una promesa que hace un comentario.
 * Galeria.module.css le pone a la captura un `aspect-ratio` fijo —16:10 en la
 * tarjeta, 4:3 en el teléfono— y al lado aclara que el recorte "ya viene en
 * esa proporción desde ffmpeg", así que el `object-fit: cover` no tiene nada
 * que cortar.
 *
 * Mientras sea cierto no pasa nada. El día que alguien toque una región de
 * recorte en scripts/capturas.sh y deje de serlo, `cover` empieza a cortar en
 * silencio: la captura se ve entera pero recortada, y no hay error en ningún
 * lado. Acá se entera el CI en vez del visitante.
 *
 * Las medidas las escribe el propio script, así que esto también avisa si
 * corrió a medias.
 */

type Medidas = Record<string, Record<string, number[]>>;
const capturas = Object.entries(medidas as Medidas);

/* El tsconfig tiene `noUncheckedIndexedAccess`, así que sacar dos números de
   un `number[]` no alcanza para el compilador: podrían no estar. En vez de
   callarlo con un cast, esto lo comprueba de verdad y falla con el nombre de
   la versión que salió mal, que es lo que uno quiere leer. */
function par(medida: number[] | undefined, que: string): [number, number] {
  const [ancho, alto] = medida ?? [];
  if (ancho === undefined || alto === undefined) {
    throw new Error(
      `${que}: se esperaba [ancho, alto] y llegó ${JSON.stringify(medida)}`,
    );
  }
  return [ancho, alto];
}

/** Las proporciones que Galeria.module.css da por hechas. */
const PROPORCIONES = {
  detalle: { ratio: 16 / 10, donde: "la tarjeta en escritorio" },
  foco: { ratio: 4 / 3, donde: "la tarjeta en el teléfono" },
} as const;

describe("medidas.json", () => {
  it("tiene capturas", () => {
    expect(capturas.length).toBeGreaterThan(0);
  });

  it.each(capturas)("%s trae las tres versiones", (_id, versiones) => {
    expect(Object.keys(versiones).sort()).toEqual(["completa", "detalle", "foco"]);
  });

  it.each(capturas)("%s tiene ancho y alto en cada versión", (_id, versiones) => {
    for (const [version, medida] of Object.entries(versiones)) {
      const [ancho, alto] = par(medida, version);
      expect(ancho, `${version}: ancho`).toBeGreaterThan(0);
      expect(alto, `${version}: alto`).toBeGreaterThan(0);
    }
  });

  /* `toBeCloseTo(…, 2)` tolera media milésima. ffmpeg fuerza alturas pares, así
     que un recorte impar corre el cociente en la tercera decimal y eso no se
     ve; un recorte equivocado de verdad mueve el número mucho antes. */
  for (const [version, { ratio, donde }] of Object.entries(PROPORCIONES)) {
    it.each(capturas)(`%s: el recorte de ${donde} respeta la proporción`, (_id, v) => {
      const [ancho, alto] = par(v[version], version);
      expect(ancho / alto).toBeCloseTo(ratio, 2);
    });
  }
});
