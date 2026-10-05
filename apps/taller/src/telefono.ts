import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/** Número completo; Argentina por defecto para los formatos nacionales. */
export function normalizarTelefono(valor: string): string | null {
  if (valor.length > 80 || !/^[+\d\s().-]+$/.test(valor)) return null;
  let entrada = valor.trim();
  const digitos = entrada.replace(/\D/g, "");
  // Admitir números internacionales escritos con 00 o sin el signo +.
  if (entrada.startsWith("00")) entrada = `+${digitos.slice(2)}`;
  else if (!entrada.startsWith("+") && /^54\d{10,11}$/.test(digitos)) {
    entrada = `+${digitos}`;
  }
  const telefono = parsePhoneNumberFromString(entrada, {
    defaultCountry: "AR",
    extract: false,
  });
  if (!telefono?.isValid()) return null;
  // En Argentina el 9 internacional distingue móvil de fijo. La identidad
  // que se compara es el número nacional completo (área más abonado).
  return telefono.country === "AR"
    ? `+54${telefono.nationalNumber.replace(/^9(?=\d{10}$)/, "")}`
    : telefono.number;
}
