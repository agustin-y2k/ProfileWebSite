/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Galeria } from "./Galeria";
import type { Captura } from "../data/capturas";

/*
 * Lo que se prueba acá es `deslizar`, que es la única cuenta que hace la
 * galería en JavaScript. El resto del deslizamiento lo pone el navegador —el
 * contenedor scrollea solo— y por eso no hay nada que probarle.
 *
 * La decisión que estos tests fijan es que el paso se mide en el DOM, la
 * distancia entre el borde de una diapositiva y el de la siguiente, y no se
 * escribe a mano. Escrito a mano andaría igual hasta que el CSS cambie el
 * ancho en otro tamaño de pantalla, y ahí las flechas empiezan a dejar la
 * tira desalineada sin que nada falle. Por eso el paso simulado es 437: un
 * número que ningún valor hardcodeado va a adivinar por casualidad.
 *
 * jsdom no maqueta, así que `offsetLeft` y `clientWidth` son siempre cero y
 * hay que dárselos. Es la parte incómoda de probar algo que depende de
 * geometría, y el motivo por el que se prueba la cuenta y no el scroll: que el
 * navegador scrollee de verdad no se puede verificar acá, y ya se verificó a
 * mano en un navegador.
 */

const PASO = 437;
const ANCHO_CONTENEDOR = 900;

const juego = (id: string) => ({
  avif: `/x/${id}.avif 100w`,
  webp: `/x/${id}.webp 100w`,
  jpg: `/x/${id}.jpg 100w`,
  respaldo: `/x/${id}.jpg`,
  ancho: 100,
  alto: 62,
});

const captura = (id: string): Captura => ({
  id,
  titulo: `Título de ${id}`,
  pie: `Pie de ${id}`,
  alt: `Alt de ${id}`,
  completa: juego(id),
  detalle: juego(id),
  foco: juego(id),
});

const TRES = [captura("a"), captura("b"), captura("c")];

let scrollBy: Mock<(opciones: ScrollToOptions) => void>;

/** Cada hijo arranca `PASO` píxeles después que el anterior. */
function simularMaquetado() {
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
    configurable: true,
    get(this: HTMLElement) {
      const padre = this.parentElement;
      return padre ? [...padre.children].indexOf(this) * PASO : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => ANCHO_CONTENEDOR,
  });
}

function simularMedios(menosMovimiento: boolean) {
  window.matchMedia = vi.fn().mockImplementation((consulta: string) => ({
    matches: consulta.includes("prefers-reduced-motion") ? menosMovimiento : false,
    media: consulta,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const flecha = (nombre: "Captura anterior" | "Captura siguiente") =>
  screen.getByRole("button", { name: nombre }) as HTMLButtonElement;

/* `toBeDisabled` vendría de @testing-library/jest-dom. Para dos aserciones no
   vale traerse otra dependencia con su archivo de setup: el atributo se lee
   igual de bien. */
const apagada = (boton: HTMLButtonElement) => boton.disabled;

/** La tira arranca en su punta, así que la flecha de atrás está apagada. Esto
 *  la despierta simulando que ya se corrió. */
function correrLaTira() {
  const tira = screen.getByRole("list", { name: /Capturas de/ });
  Object.defineProperty(tira, "scrollLeft", { configurable: true, value: PASO });
  fireEvent.scroll(tira);
}

beforeEach(() => {
  simularMaquetado();
  simularMedios(false);
  scrollBy = vi.fn();
  // `scrollBy` acepta dos formas —un objeto de opciones o un par de números—.
  // La galería usa la primera, así que el mock implementa esa sola.
  HTMLElement.prototype.scrollBy = scrollBy as HTMLElement["scrollBy"];
});

afterEach(cleanup);

describe("Galeria: las flechas", () => {
  it("corre exactamente una diapositiva hacia adelante", () => {
    render(<Galeria capturas={TRES} proyecto="SGRC" />);
    fireEvent.click(flecha("Captura siguiente"));

    expect(scrollBy).toHaveBeenCalledWith({ left: PASO, behavior: "smooth" });
  });

  it("corre la misma distancia hacia atrás", () => {
    render(<Galeria capturas={TRES} proyecto="SGRC" />);
    correrLaTira();
    fireEvent.click(flecha("Captura anterior"));

    expect(scrollBy).toHaveBeenCalledWith({ left: -PASO, behavior: "smooth" });
  });

  /* Con una sola diapositiva no hay segunda contra la cual medir. El paso cae
     al ancho del contenedor, que con una sola es lo mismo. */
  it("con una sola captura se apoya en el ancho del contenedor", () => {
    render(<Galeria capturas={[captura("sola")]} proyecto="SGRC" />);
    fireEvent.click(flecha("Captura siguiente"));

    expect(scrollBy).toHaveBeenCalledWith({
      left: ANCHO_CONTENEDOR,
      behavior: "smooth",
    });
  });

  it("no anima si el sistema pide menos movimiento", () => {
    simularMedios(true);
    render(<Galeria capturas={TRES} proyecto="SGRC" />);
    fireEvent.click(flecha("Captura siguiente"));

    expect(scrollBy).toHaveBeenCalledWith({ left: PASO, behavior: "auto" });
  });

  /* En las puntas la flecha que no lleva a ningún lado se apaga: es lo que
     evita el clic que no hace nada. */
  it("arranca con la flecha de atrás apagada", () => {
    render(<Galeria capturas={TRES} proyecto="SGRC" />);

    expect(apagada(flecha("Captura anterior"))).toBe(true);
    expect(apagada(flecha("Captura siguiente"))).toBe(false);
  });

  it("enciende la de atrás cuando la tira se movió", () => {
    render(<Galeria capturas={TRES} proyecto="SGRC" />);
    correrLaTira();

    expect(apagada(flecha("Captura anterior"))).toBe(false);
  });
});
