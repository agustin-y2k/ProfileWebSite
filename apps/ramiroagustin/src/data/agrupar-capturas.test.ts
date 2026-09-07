import { describe, expect, it } from "vitest";
import { agruparArchivos, analizarNombre, lectorDeJuegos } from "./agrupar-capturas";

const ruta = (nombre: string) => `../assets/capturas/${nombre}`;

describe("analizarNombre", () => {
  it("lee la página entera, que no lleva palabra de versión", () => {
    expect(analizarNombre(ruta("01-mostrador-1800.avif"))).toEqual({
      id: "01-mostrador",
      version: "completa",
      ancho: "1800",
      formato: "avif",
    });
  });

  it("lee los dos recortes", () => {
    expect(analizarNombre(ruta("01-mostrador-detalle-1056.webp"))).toMatchObject({
      id: "01-mostrador",
      version: "detalle",
    });
    expect(analizarNombre(ruta("01-mostrador-foco-585.jpg"))).toMatchObject({
      id: "01-mostrador",
      version: "foco",
    });
  });

  /*
   * El caso por el que existe este archivo. `09-reportes-oscuro-detalle-1056`
   * tiene guiones en el id y una palabra de versión detrás: si el id se leyera
   * de forma glotona se comería el `-detalle` y la captura terminaría
   * archivada como página entera. Nada falla ese día; simplemente la galería
   * sirve el recorte equivocado.
   */
  it("no confunde los guiones del id con la palabra de la versión", () => {
    expect(analizarNombre(ruta("09-reportes-oscuro-detalle-1056.avif"))).toMatchObject({
      id: "09-reportes-oscuro",
      version: "detalle",
    });
  });

  it("deja el id entero cuando no hay palabra de versión", () => {
    expect(analizarNombre(ruta("09-reportes-oscuro-1800.avif"))).toMatchObject({
      id: "09-reportes-oscuro",
      version: "completa",
    });
  });

  it("ignora lo que no es una captura", () => {
    expect(analizarNombre(ruta("mostrador.png"))).toBeNull();
    expect(analizarNombre(ruta("01-mostrador.avif"))).toBeNull();
    expect(analizarNombre(ruta("01-mostrador-ancho.avif"))).toBeNull();
    expect(analizarNombre("../assets/perfil-320.jpg")).toMatchObject({ id: "perfil" });
  });
});

describe("agruparArchivos", () => {
  it("junta los anchos de un mismo formato en un solo srcSet", () => {
    const { fuentes } = agruparArchivos({
      [ruta("01-mostrador-detalle-1056.avif")]: "/img/a-1056.avif",
      [ruta("01-mostrador-detalle-2240.avif")]: "/img/a-2240.avif",
    });

    expect(fuentes.get("01-mostrador:detalle")?.avif).toEqual([
      "/img/a-1056.avif 1056w",
      "/img/a-2240.avif 2240w",
    ]);
  });

  it("separa las versiones de una misma captura", () => {
    const { fuentes } = agruparArchivos({
      [ruta("01-mostrador-1800.avif")]: "/img/entera.avif",
      [ruta("01-mostrador-detalle-1056.avif")]: "/img/detalle.avif",
      [ruta("01-mostrador-foco-585.avif")]: "/img/foco.avif",
    });

    expect([...fuentes.keys()].sort()).toEqual([
      "01-mostrador:completa",
      "01-mostrador:detalle",
      "01-mostrador:foco",
    ]);
  });

  /* El `<img>` se apoya en el jpg: es lo que recibe quien no entiende ni avif
     ni webp. Si el respaldo se guardara de cualquier formato, ese visitante se
     llevaría un archivo que su navegador no sabe abrir. */
  it("toma el respaldo del jpg y de ningún otro formato", () => {
    const { respaldos } = agruparArchivos({
      [ruta("01-mostrador-detalle-1056.avif")]: "/img/no.avif",
      [ruta("01-mostrador-detalle-1056.webp")]: "/img/no.webp",
      [ruta("01-mostrador-detalle-1056.jpg")]: "/img/si.jpg",
    });

    expect(respaldos.get("01-mostrador:detalle")).toBe("/img/si.jpg");
  });

  it("no inventa formatos: los que no llegaron quedan vacíos", () => {
    const { fuentes } = agruparArchivos({
      [ruta("01-mostrador-detalle-1056.avif")]: "/img/a.avif",
    });

    expect(fuentes.get("01-mostrador:detalle")).toEqual({
      avif: ["/img/a.avif 1056w"],
      webp: [],
      jpg: [],
    });
  });

  it("no se cae con un directorio sin capturas", () => {
    const { fuentes, respaldos } = agruparArchivos({ [ruta("leeme.txt")]: "/x" });
    expect(fuentes.size).toBe(0);
    expect(respaldos.size).toBe(0);
  });
});

describe("lectorDeJuegos", () => {
  const archivos = {
    [ruta("01-mostrador-detalle-1056.avif")]: "/img/d-1056.avif",
    [ruta("01-mostrador-detalle-2240.avif")]: "/img/d-2240.avif",
    [ruta("01-mostrador-detalle-1056.webp")]: "/img/d-1056.webp",
    [ruta("01-mostrador-detalle-1056.jpg")]: "/img/d-1056.jpg",
  };
  const tabla = { "01-mostrador": { detalle: [2240, 1400] } };
  const leer = () => lectorDeJuegos(agruparArchivos(archivos), tabla);

  it("arma el srcSet de cada formato y toma las medidas de la tabla", () => {
    expect(leer()("01-mostrador", "detalle")).toEqual({
      avif: "/img/d-1056.avif 1056w, /img/d-2240.avif 2240w",
      webp: "/img/d-1056.webp 1056w",
      jpg: "/img/d-1056.jpg 1056w",
      respaldo: "/img/d-1056.jpg",
      ancho: 2240,
      alto: 1400,
    });
  });

  /*
   * Esta es la red que sostiene todo lo demás: la lista de capturas se arma al
   * importar el módulo y `pnpm build` la prerrenderiza, así que media captura
   * rompe el build en vez de servirle un `img` roto a quien entre al sitio.
   * Los cuatro casos son las cuatro formas de que falte algo, y las cuatro
   * tienen que gritar igual — si una sola devolviera un juego a medias, el
   * sitio saldría a producción con una imagen que no carga.
   */
  it("se planta si falta la versión entera", () => {
    expect(() => leer()("01-mostrador", "foco")).toThrow(/Falta la versión "foco"/);
  });

  it("se planta si la captura no existe", () => {
    expect(() => leer()("99-inventada", "detalle")).toThrow(/99-inventada/);
  });

  it("se planta si están los archivos pero no las medidas", () => {
    const sinTabla = lectorDeJuegos(agruparArchivos(archivos), {});
    expect(() => sinTabla("01-mostrador", "detalle")).toThrow(/Falta la versión/);
  });

  it("se planta si están las medidas pero no los archivos", () => {
    const sinArchivos = lectorDeJuegos(agruparArchivos({}), tabla);
    expect(() => sinArchivos("01-mostrador", "detalle")).toThrow(/Falta la versión/);
  });

  /* Sin jpg no hay `src` para el `img`, así que tampoco alcanza: el visitante
     que no entiende avif ni webp se quedaría sin nada que mostrar. */
  it("se planta si hay avif y webp pero ningún jpg", () => {
    const sinJpg = lectorDeJuegos(
      agruparArchivos({
        [ruta("01-mostrador-detalle-1056.avif")]: "/img/d.avif",
        [ruta("01-mostrador-detalle-1056.webp")]: "/img/d.webp",
      }),
      tabla,
    );
    expect(() => sinJpg("01-mostrador", "detalle")).toThrow(/Falta la versión/);
  });

  it("dice qué hay que correr para arreglarlo", () => {
    expect(() => leer()("01-mostrador", "completa")).toThrow(/capturas\.sh/);
  });
});
