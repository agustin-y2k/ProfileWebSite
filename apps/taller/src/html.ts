/**
 * Plantillas HTML con escapado automático.
 *
 * Todo lo que se interpola en `html\`...\`` se escapa salvo que ya sea el
 * resultado de otro `html\`...\``. Es lo contrario del template literal pelado,
 * donde olvidarse un escapado en un solo campo —el nombre de un cliente, la
 * falla que dictó por teléfono— alcanza para inyectar HTML en el panel.
 */
export type Html = { readonly html: string };

const reemplazos: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapar(valor: unknown): string {
  if (valor === null || valor === undefined || valor === false) return "";
  return String(valor).replace(
    /[&<>"']/g,
    (caracter) => reemplazos[caracter] ?? caracter,
  );
}

function esHtml(valor: unknown): valor is Html {
  return typeof valor === "object" && valor !== null && "html" in valor;
}

function renderizar(valor: unknown): string {
  if (Array.isArray(valor)) return valor.map(renderizar).join("");
  if (esHtml(valor)) return valor.html;
  return escapar(valor);
}

export function html(partes: TemplateStringsArray, ...valores: unknown[]): Html {
  let salida = partes[0] ?? "";
  for (let i = 0; i < valores.length; i++) {
    salida += renderizar(valores[i]) + (partes[i + 1] ?? "");
  }
  return { html: salida };
}

/**
 * Marca una cadena como HTML ya seguro. Solo para literales escritos acá
 * adentro: nunca para algo que venga de un formulario o de la base.
 */
export function crudo(cadena: string): Html {
  return { html: cadena };
}
