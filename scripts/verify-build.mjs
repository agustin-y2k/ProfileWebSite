import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

export async function verificarPagina(ruta, csp, react = true) {
  const html = await readFile(ruta, "utf8");
  assert.ok(!/<!--(?:app-html|meta)-->/u.test(html), `${ruta}: marcador sin reemplazar`);
  const dom = new JSDOM(html);
  try {
    const doc = dom.window.document;
    if (react) {
      const root = doc.getElementById("root");
      assert.ok(
        root?.querySelector("h1")?.textContent.trim(),
        `${ruta}: falta contenido prerenderizado`,
      );
    }
    const directivas = new Map(
      csp.split(";").map((d) => {
        const [nombre, ...valores] = d.trim().split(/\s+/u);
        return [nombre, valores];
      }),
    );
    assert.ok(
      !csp.includes("'unsafe-inline'") && !csp.includes("'unsafe-eval'"),
      `${ruta}: CSP demasiado permisiva`,
    );
    const comprobar = (directiva, contenido) => {
      const hash = `'sha256-${createHash("sha256").update(contenido).digest("base64")}'`;
      assert.ok(
        directivas.get(directiva)?.includes(hash),
        `${ruta}: hash ausente en ${directiva}`,
      );
    };
    for (const script of doc.querySelectorAll("script:not([src])"))
      comprobar("script-src", script.textContent);
    for (const estilo of doc.querySelectorAll("style"))
      comprobar("style-src", estilo.textContent);
    for (const elemento of doc.querySelectorAll("[style]"))
      comprobar("style-src-attr", elemento.getAttribute("style"));
    assert.equal(
      directivas.get("script-src-attr")?.join(" "),
      "'none'",
      `${ruta}: manejadores inline permitidos`,
    );
  } finally {
    dom.window.close();
  }
}

async function verificarBuild() {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const paginas = {
    ramiroagustin: [
      "index.html",
      "en/index.html",
      "algoritmos/index.html",
      "en/algoritmos/index.html",
      "cv.html",
      "en/cv.html",
    ],
    bytefix: ["index.html"],
  };
  for (const [app, archivos] of Object.entries(paginas)) {
    const root = join(repo, "apps", app);
    const cabeceras = await readFile(
      join(root, "dist-security", "security-headers.conf"),
      "utf8",
    );
    const csp = cabeceras.match(
      /add_header Content-Security-Policy "([^"]+)" always;/u,
    )?.[1];
    assert.ok(csp, `${app}: falta CSP generada`);
    for (const archivo of archivos) {
      await verificarPagina(
        join(root, "dist", archivo),
        csp,
        !archivo.endsWith("cv.html"),
      );
      console.log(`✓ ${app}/${archivo}: contenido y CSP verificados`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await verificarBuild();
}
