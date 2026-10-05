import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verificarPagina } from "./verify-build.mjs";

test("el chequeo de build detecta HTML vacío y hashes desactualizados", async () => {
  const dir = await mkdtemp(join(tmpdir(), "verify-build-"));
  try {
    const ruta = join(dir, "index.html");
    const script = 'window.tema = "oscuro";';
    const hash = createHash("sha256").update(script).digest("base64");
    const csp = `script-src 'self' 'sha256-${hash}'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'`;
    await writeFile(ruta, `<div id="root" data-pagina="inicio">  </div>`);
    await assert.rejects(verificarPagina(ruta, csp), /falta contenido prerenderizado/u);
    await writeFile(
      ruta,
      `<div id="root"><h1>Mi página</h1></div><script>${script}</script>`,
    );
    await verificarPagina(ruta, csp);
    await writeFile(
      ruta,
      `<div id="root"><h1>Mi página</h1></div><script>${script}alert(1)</script>`,
    );
    await assert.rejects(verificarPagina(ruta, csp), /hash ausente/u);
    await assert.rejects(verificarPagina(join(dir, "inexistente.html"), csp), /ENOENT/u);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
