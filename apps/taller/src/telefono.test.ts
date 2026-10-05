import { describe, expect, it } from "vitest";
import { normalizarTelefono } from "./telefono";

describe("Teléfono completo para seguimiento", () => {
  it.each([
    "2604310000",
    "0260 431-0000",
    "+54 260 4310000",
    "+54 9 260 4310000",
    "5492604310000",
    "005492604310000",
    "0260 15 4310000",
  ])("normaliza el formato argentino %s", (valor) => {
    expect(normalizarTelefono(valor)).toBe("+542604310000");
  });

  it.each([
    "310000",
    "4310000",
    "",
    "abc2604310000",
    "2604310000 ext 1",
    "+123",
    "0".repeat(81),
  ])("rechaza números parciales o inválidos: %s", (valor) => {
    expect(normalizarTelefono(valor)).toBeNull();
  });

  it("conserva el país para no confundir números extranjeros", () => {
    expect(normalizarTelefono("+1 202 555 0123")).toBe("+12025550123");
    expect(normalizarTelefono("+54 11 5555 0123")).not.toBe("+12025550123");
  });
});
