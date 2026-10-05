import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { scryptSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Servidor y SQLite reales, con datos ficticios en una carpeta temporal.
const cwd = fileURLToPath(new URL("..", import.meta.url));
let datos: string;
let servidor: ChildProcess;
let origen: string;
let sesion: string;
let ordenes: { numero: string; token: string; modelo: string }[];
const telefono = "2604310000";
const contrasena = "clave-ficticia-de-prueba";

beforeAll(async () => {
  datos = mkdtempSync(resolve(tmpdir(), "taller-seguimiento-"));
  const env = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([nombre]) => !nombre.startsWith("TALLER_")),
    ),
    TALLER_DATOS: datos,
    TALLER_HOST: "127.0.0.1",
    TALLER_PUERTO: "0",
    TALLER_AUTH: "on",
    TALLER_PASSWORD_HASH: `scrypt:abcd:${scryptSync(contrasena, Buffer.from("abcd", "hex"), 64).toString("hex")}`,
    TALLER_SMTP_USUARIO: "",
    TALLER_SMTP_CLAVE: "",
    TALLER_LOG: "info",
  };
  const semilla = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `import { crearOrden, buscarPorNumero, ORDEN_VACIA, agregarEvento } from './src/ordenes.ts';
       import { db } from './src/db.ts';
       import { crearSesion } from './src/auth.ts';
       const ordenes = ['Notebook-A', 'Notebook-B'].map(modelo => {
         const numero = crearOrden({ ...ORDEN_VACIA, cliente_nombre: 'Cliente ficticio',
           cliente_telefono: '${telefono}', cliente_email: 'prueba@example.invalid',
           equipo_tipo: 'Notebook', modelo, presupuesto: 'Presupuesto-' + modelo });
         const orden = buscarPorNumero(numero);
         agregarEvento(orden.id, 'en diagnóstico', 'Nota-' + modelo);
         return { numero, token: orden.token, modelo };
       });
       console.log(JSON.stringify({ ordenes, sesion: crearSesion() }));
       db.close();`,
    ],
    { cwd, env, encoding: "utf8", timeout: 15000 },
  );
  if (semilla.status !== 0) {
    throw new Error(semilla.error?.message ?? semilla.stderr);
  }
  ({ ordenes, sesion } = JSON.parse(semilla.stdout));
  servidor = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  origen = await new Promise<string>((resolve, reject) => {
    let salida = "";
    let errores = "";
    servidor.stderr!.on("data", (chunk: Buffer) => {
      errores += chunk.toString();
    });
    const timeout = setTimeout(
      () => reject(new Error(`El taller no arrancó.\n${salida}\n${errores}`)),
      15000,
    );
    servidor.stdout!.on("data", (chunk: Buffer) => {
      salida += chunk.toString();
      const url = salida.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (url) {
        clearTimeout(timeout);
        resolve(url);
      }
    });
    servidor.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    servidor.once("exit", (code) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `El taller terminó antes de arrancar (${code}).\n${salida}\n${errores}`,
        ),
      );
    });
  });
}, 40000);

afterAll(async () => {
  if (servidor && servidor.exitCode === null && servidor.signalCode === null) {
    const salida = once(servidor, "exit");
    const forzar = setTimeout(() => servidor.kill("SIGKILL"), 2000);
    servidor.kill();
    try {
      await salida;
    } finally {
      clearTimeout(forzar);
    }
  }
  if (datos) rmSync(datos, { recursive: true, force: true });
});

function comprobarOrden(
  html: string,
  propia: (typeof ordenes)[number],
  otra: (typeof ordenes)[number],
) {
  expect(html).toContain(propia.numero);
  expect(html).toContain(propia.modelo);
  expect(html).toContain(`Presupuesto-${propia.modelo}`);
  expect(html).toContain(`Nota-${propia.modelo}`);
  expect(html).not.toContain(otra.numero);
  expect(html).not.toContain(otra.token);
  expect(html).not.toContain(otra.modelo);
  expect(html).not.toContain("Tus otros equipos");
  expect(html).not.toContain('href="/s/');
}

describe("Seguimiento público: un token autoriza una orden", () => {
  it("rechaza contraseñas incorrectas y permite entrar con una sesión nueva", async () => {
    for (const [clave, status] of [
      ["incorrecta", 401],
      [contrasena, 303],
    ] as const) {
      const respuesta = await fetch(`${origen}/entrar`, {
        method: "POST",
        body: new URLSearchParams({ contrasena: clave }),
        redirect: "manual",
      });
      expect(respuesta.status).toBe(status);
      if (status === 303) {
        const cookie = respuesta.headers.get("set-cookie")!;
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("SameSite=Lax");
        const panel = await fetch(`${origen}/ordenes/${ordenes[0]!.numero}`, {
          headers: { Cookie: cookie.split(";")[0]! },
          redirect: "manual",
        });
        expect(panel.status).toBe(200);
        await panel.text();
      } else {
        expect(respuesta.headers.get("set-cookie")).toBeNull();
      }
      await respuesta.text();
    }
  });
  it("protege páginas, recursos, redirecciones y errores con las mismas cabeceras", async () => {
    const casos = [
      { ruta: "/seguimiento", status: 200 },
      { ruta: `/s/${ordenes[0]!.token}`, status: 200 },
      { ruta: "/s/token-inexistente", status: 404 },
      { ruta: `/ordenes/${ordenes[0]!.numero}`, status: 302 },
      { ruta: "/nueva", status: 200, privada: true },
      { ruta: `/ordenes/${ordenes[0]!.numero}`, status: 200, privada: true },
      {
        ruta: `/ordenes/${ordenes[0]!.numero}/comprobante.pdf`,
        status: 200,
        privada: true,
      },
      {
        ruta: `/ordenes/${ordenes[0]!.numero}/firma.png`,
        status: 404,
        privada: true,
      },
      { ruta: `/fotos/${"a".repeat(32)}`, status: 404, privada: true },
      { ruta: "/formulario.js", status: 200 },
      { ruta: "/estilos.css", status: 200 },
    ];
    for (const caso of casos) {
      const respuesta = await fetch(`${origen}${caso.ruta}`, {
        redirect: "manual",
        headers: caso.privada ? { Cookie: `taller_sesion=${sesion}` } : {},
      });
      expect(respuesta.status, caso.ruta).toBe(caso.status);
      expect(respuesta.headers.get("cache-control"), caso.ruta).toBe("private, no-store");
      expect(respuesta.headers.get("referrer-policy")).toBe("no-referrer");
      expect(respuesta.headers.get("x-content-type-options")).toBe("nosniff");
      expect(respuesta.headers.get("x-frame-options")).toBe("DENY");
      expect(respuesta.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      const csp = respuesta.headers.get("content-security-policy")!;
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).not.toContain("unsafe-inline");
      expect(csp).not.toContain("unsafe-eval");
      if (caso.ruta === "/nueva") {
        expect(await respuesta.text()).toContain('<script src="/formulario.js" defer>');
      } else {
        await respuesta.arrayBuffer();
      }
    }
  });

  it("protege también los errores que rechazan un cuerpo demasiado grande", async () => {
    const respuesta = await fetch(`${origen}/seguimiento`, {
      method: "POST",
      headers: { "X-Forwarded-For": "192.0.2.20" },
      body: new URLSearchParams({ numero: "x".repeat(5000), telefono }),
      redirect: "manual",
    });
    expect(respuesta.status).toBe(413);
    expect(respuesta.headers.get("cache-control")).toBe("private, no-store");
    expect(respuesta.headers.get("referrer-policy")).toBe("no-referrer");
    expect(respuesta.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    await respuesta.text();
  });
  it("cada enlace muestra su orden y sus novedades sin revelar otras del mismo teléfono", async () => {
    for (const [indice, orden] of ordenes.entries()) {
      const respuesta = await fetch(`${origen}/s/${orden.token}`);
      expect(respuesta.status).toBe(200);
      comprobarOrden(await respuesta.text(), orden, ordenes[1 - indice]!);
    }
  });

  it("recuperar un enlace también limita el acceso a la orden solicitada", async () => {
    const orden = ordenes[0]!;
    const respuesta = await fetch(`${origen}/seguimiento`, {
      method: "POST",
      body: new URLSearchParams({ numero: orden.numero, telefono }),
      redirect: "manual",
    });
    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.get("location")).toBe(`/s/${orden.token}`);
    const pagina = await fetch(`${origen}${respuesta.headers.get("location")}`);
    comprobarOrden(await pagina.text(), orden, ordenes[1]!);
  });

  it("un token inexistente no revela datos y el panel sigue requiriendo sesión", async () => {
    const respuesta = await fetch(`${origen}/s/token-inexistente`);
    expect(respuesta.status).toBe(404);
    const html = await respuesta.text();
    for (const orden of ordenes) {
      expect(html).not.toContain(orden.numero);
      expect(html).not.toContain(orden.token);
    }
    const panel = await fetch(`${origen}/ordenes/${ordenes[0]!.numero}`, {
      redirect: "manual",
    });
    expect(panel.status).toBe(302);
    expect(panel.headers.get("location")).toBe("/entrar");
  });

  it("rechaza un teléfono parcial igual que una orden inexistente", async () => {
    const buscar = (numero: string, telefono: string) =>
      fetch(`${origen}/seguimiento`, {
        method: "POST",
        body: new URLSearchParams({ numero, telefono }),
        redirect: "manual",
      });
    for (const parcial of [telefono.slice(-6), telefono.slice(-7)]) {
      const respuesta = await buscar(ordenes[0]!.numero, parcial);
      expect(respuesta.status).toBe(404);
      expect(respuesta.headers.get("location")).toBeNull();
      expect(await respuesta.text()).not.toContain(ordenes[0]!.token);
    }
    const inexistente = await buscar("BF-1900-9999", telefono);
    expect(inexistente.status).toBe(404);
    expect(await inexistente.text()).toContain(
      "No encontramos una orden con esos datos.",
    );
  });

  it("limita los intentos incluso cambiando número, teléfono o prefijo X-Forwarded-For", async () => {
    // Usar una IP de cliente distinta de los tests anteriores. El último
    // salto representa la IP que Cloudflare agrega; los prefijos no mandan.
    for (let intento = 0; intento < 5; intento++) {
      const respuesta = await fetch(`${origen}/seguimiento`, {
        method: "POST",
        headers: { "X-Forwarded-For": `198.51.100.${intento + 1}, 192.0.2.10` },
        body: new URLSearchParams({ numero: `BF-1900-${intento}`, telefono }),
        redirect: "manual",
      });
      expect(respuesta.status).toBe(404);
    }
    const bloqueada = await fetch(`${origen}/seguimiento`, {
      method: "POST",
      headers: { "X-Forwarded-For": "198.51.100.99, 192.0.2.10" },
      body: new URLSearchParams({ numero: ordenes[0]!.numero, telefono }),
      redirect: "manual",
    });
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers.get("cache-control")).toBe("private, no-store");
    expect(bloqueada.headers.get("referrer-policy")).toBe("no-referrer");
    expect(bloqueada.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(Number(bloqueada.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(bloqueada.headers.get("location")).toBeNull();
    expect(await bloqueada.text()).not.toContain(ordenes[0]!.token);
    const otraIp = await fetch(`${origen}/seguimiento`, {
      method: "POST",
      headers: { "X-Forwarded-For": "192.0.2.11" },
      body: new URLSearchParams({ numero: ordenes[0]!.numero, telefono }),
      redirect: "manual",
    });
    expect(otraIp.status).toBe(303);
    expect((await fetch(`${origen}/s/${ordenes[0]!.token}`)).status).toBe(200);
  });
});
