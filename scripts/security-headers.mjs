import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const hash = (texto) => `'sha256-${createHash("sha256").update(texto).digest("base64")}'`;

// Se lee el HTML FINAL: incluye traducciones, JSON-LD, CV y estilos de SSR.
// El parser reproduce la normalización del HTML que realiza el navegador.
export async function generarCabeceras(root) {
  const scripts = new Set();
  const estilos = new Set();
  const atributos = new Set();
  async function visitar(dir) {
    for (const entrada of await readdir(dir, { withFileTypes: true })) {
      const ruta = join(dir, entrada.name);
      if (entrada.isDirectory()) await visitar(ruta);
      else if (entrada.name.endsWith(".html")) {
        const dom = new JSDOM(await readFile(ruta, "utf8"));
        const doc = dom.window.document;
        for (const script of doc.querySelectorAll("script:not([src])")) {
          scripts.add(hash(script.textContent));
        }
        for (const estilo of doc.querySelectorAll("style")) {
          estilos.add(hash(estilo.textContent));
        }
        for (const elemento of doc.querySelectorAll("[style]")) {
          atributos.add(hash(elemento.getAttribute("style")));
        }
        // Nunca autorizar accidentalmente manejadores como onclick.
        for (const elemento of doc.querySelectorAll("*")) {
          if ([...elemento.attributes].some((a) => /^on/i.test(a.name))) {
            throw new Error(`Manejador inline no permitido en ${ruta}`);
          }
        }
        dom.window.close();
      }
    }
  }
  await visitar(join(root, "dist"));

  const analitica = "https://analytics.ramiroagustin.online";
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${[...scripts].sort().join(" ")} ${analitica}`,
    "script-src-attr 'none'",
    `style-src 'self' ${[...estilos].sort().join(" ")}`,
    atributos.size
      ? `style-src-attr 'unsafe-hashes' ${[...atributos].sort().join(" ")}`
      : "style-src-attr 'none'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${analitica}`,
    "form-action 'self'",
    "frame-ancestors 'self'",
    "frame-src 'none'",
    "base-uri 'none'",
    "object-src 'none'",
  ].join("; ");
  const cabeceras = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": csp,
  };
  const destino = join(root, "dist-security");
  await mkdir(destino, { recursive: true });
  await writeFile(
    join(destino, "security-headers.conf"),
    "# Generado desde el HTML compilado; no editar manualmente.\n" +
      Object.entries(cabeceras)
        .map(([nombre, valor]) => `add_header ${nombre} "${valor}" always;`)
        .join("\n") +
      "\n",
  );
  console.log(
    `✓ CSP: ${scripts.size} scripts, ${estilos.size} bloques CSS y ${atributos.size} estilos autorizados por hash`,
  );
}
