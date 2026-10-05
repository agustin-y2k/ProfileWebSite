/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { Reveal } from "@sites/ui";
import { Header } from "./Header";
import { ThemeToggle } from "./ThemeToggle";
import { Visualizador } from "./Visualizador";
import { ProveedorIdioma } from "../i18n/contexto";

let desktop: boolean;
let mediaListeners: Set<() => void>;

beforeEach(() => {
  desktop = false;
  mediaListeners = new Set();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === "(min-width: 64rem)" && desktop;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => {
      if (query === "(min-width: 64rem)") mediaListeners.add(listener);
    },
    removeEventListener: (_: string, listener: () => void) => {
      mediaListeners.delete(listener);
    },
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Frontend: mejora progresiva y navegación", () => {
  it("sirve los bloques visibles hasta que se registra el observador", () => {
    const html = renderToString(<Reveal>Proyecto</Reveal>);
    expect(html).not.toContain("data-reveal-ready");
    const { container } = render(<Reveal>Proyecto</Reveal>);
    expect(container.firstElementChild?.hasAttribute("data-reveal-ready")).toBe(true);
  });

  it("mantiene visible el contenido cuando no hay IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<Reveal>Proyecto</Reveal>);
    expect(container.firstElementChild?.hasAttribute("data-reveal-ready")).toBe(false);
    expect(container.firstElementChild?.hasAttribute("data-visible")).toBe(true);
  });

  it("cierra el menú y restaura el scroll al pasar a escritorio", () => {
    document.body.style.overflow = "auto";
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(document.body.style.overflow).toBe("hidden");
    act(() => {
      desktop = true;
      mediaListeners.forEach((listener) => listener());
    });
    expect(document.body.style.overflow).toBe("auto");
    expect(
      screen.getByRole("button", { name: "Abrir menú" }).getAttribute("aria-expanded"),
    ).toBe("false");
    act(() => {
      desktop = false;
      mediaListeners.forEach((listener) => listener());
    });
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });

  it("traduce las etiquetas del tema y las actualiza al alternarlo", () => {
    render(
      <ProveedorIdioma idioma="en">
        <ThemeToggle />
      </ProveedorIdioma>,
    );
    const button = screen.getByRole("button", { name: "Switch to dark theme" });
    expect(button.title).toBe("Switch to dark theme");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Switch to light theme" }).title).toBe(
      "Switch to light theme",
    );
  });

  it("conecta las pestañas con sus paneles y permite recorrerlas con teclado", () => {
    render(<Visualizador />);
    const codigo = screen.getByRole("tab", { name: "Código" });
    const estado = screen.getByRole("tab", { name: "Estado" });
    expect(codigo.tabIndex).toBe(0);
    expect(estado.tabIndex).toBe(-1);
    expect(
      document
        .getElementById(codigo.getAttribute("aria-controls")!)
        ?.getAttribute("aria-labelledby"),
    ).toBe(codigo.id);
    fireEvent.keyDown(codigo, { key: "ArrowRight" });
    expect(document.activeElement).toBe(estado);
    expect(estado.getAttribute("aria-selected")).toBe("true");
    expect(estado.tabIndex).toBe(0);
    expect(codigo.tabIndex).toBe(-1);
    fireEvent.keyDown(estado, { key: "Home" });
    expect(document.activeElement).toBe(codigo);
    fireEvent.keyDown(codigo, { key: "End" });
    expect(document.activeElement).toBe(estado);
    fireEvent.keyDown(estado, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(codigo);
    act(() => {
      desktop = true;
      mediaListeners.forEach((listener) => listener());
    });
    const panel = document.getElementById(codigo.getAttribute("aria-controls")!)!;
    expect(panel.getAttribute("role")).toBe("region");
    expect(
      document.getElementById(panel.getAttribute("aria-labelledby")!)?.textContent,
    ).toBe("La línea que se está ejecutando");
  });
});
