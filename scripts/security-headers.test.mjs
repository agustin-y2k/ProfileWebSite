import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { generarCabeceras } from "./security-headers.mjs";

test("autoriza bloques exactos del HTML final y rechaza manejadores inline", async () => {
  const root = await mkdtemp(join(tmpdir(), "csp-build-"));
  try {
    await mkdir(join(root, "dist", "en"), { recursive: true });
    const script = '\nwindow.tema = "oscuro";\n';
    const css = "body { color: red; }";
    await writeFile(
      join(root, "dist", "index.html"),
      `<script>${script}</script>
      <style>${css}</style><div style="font-family: &quot;Arial&quot;"></div>`,
    );
    await writeFile(
      join(root, "dist", "en", "cv.html"),
      '<script>window.print();</script><script src="/assets/app.js"></script>',
    );
    await generarCabeceras(root);
    const headers = await readFile(
      join(root, "dist-security", "security-headers.conf"),
      "utf8",
    );
    const hash = (texto) =>
      `'sha256-${createHash("sha256").update(texto).digest("base64")}'`;
    for (const contenido of [script, css, 'font-family: "Arial"', "window.print();"]) {
      assert.ok(headers.includes(hash(contenido)));
    }
    assert.ok(!headers.includes(hash(script + "alert(1)")));
    assert.ok(!headers.includes("unsafe-inline"));
    assert.ok(!headers.includes("unsafe-eval"));
    assert.ok(headers.includes("script-src-attr 'none'"));
    assert.ok(headers.includes("style-src-attr 'unsafe-hashes'"));
    for (const nombre of [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Content-Security-Policy",
    ]) {
      assert.match(headers, new RegExp(`add_header ${nombre} .* always;`));
    }
    await writeFile(
      join(root, "dist", "index.html"),
      '<button onclick="alert(1)">X</button>',
    );
    await assert.rejects(generarCabeceras(root), /Manejador inline no permitido/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
