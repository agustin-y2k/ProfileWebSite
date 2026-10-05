import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("envía el comprobante PDF y el enlace por SMTP y registra el envío", async () => {
  const datos = mkdtempSync(resolve(tmpdir(), "taller-correo-"));
  const sockets = new Set<Socket>();
  let mensaje = "";
  const destinatarios: string[] = [];
  // SMTP ficticio local: ninguna conexión con proveedores ni correos reales.
  const smtp = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost prueba\r\n");
    let pendiente = "";
    let recibiendo = false;
    socket.on("data", (chunk) => {
      pendiente += chunk.toString();
      let corte: number;
      while ((corte = pendiente.indexOf("\r\n")) >= 0) {
        const linea = pendiente.slice(0, corte);
        pendiente = pendiente.slice(corte + 2);
        if (recibiendo) {
          if (linea === ".") {
            recibiendo = false;
            socket.write("250 recibido\r\n");
          } else mensaje += `${linea}\r\n`;
        } else if (linea.startsWith("EHLO")) {
          socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
        } else if (linea.startsWith("AUTH PLAIN")) {
          socket.write("235 autenticado\r\n");
        } else if (linea.startsWith("RCPT TO:")) {
          destinatarios.push(linea);
          socket.write("250 ok\r\n");
        } else if (linea === "DATA") {
          recibiendo = true;
          socket.write("354 enviar mensaje\r\n");
        } else if (linea === "QUIT") {
          socket.end("221 fin\r\n");
        } else socket.write("250 ok\r\n");
      }
    });
  });
  let proceso: ChildProcess | undefined;
  try {
    smtp.listen(0, "127.0.0.1");
    await once(smtp, "listening");
    const puerto = (smtp.address() as { port: number }).port;
    proceso = spawn(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        `
      import { crearOrden, buscarPorNumero, ORDEN_VACIA } from './src/ordenes.ts';
      import { encolarComprobante } from './src/correo.ts';
      import { db } from './src/db.ts';
      const numero = crearOrden({ ...ORDEN_VACIA, cliente_nombre: 'Cliente ficticio',
        cliente_telefono: '2604310000', cliente_email: 'cliente@example.invalid',
        equipo_tipo: 'Notebook', modelo: 'Equipo ficticio' });
      const timeout = setTimeout(() => process.exit(2), 15000);
      encolarComprobante(numero, (mensaje) => {
        if (mensaje === 'comprobante enviado') {
          console.log(JSON.stringify(buscarPorNumero(numero)));
          clearTimeout(timeout);
          db.close();
        } else { console.error(mensaje); process.exit(3); }
      });
    `,
      ],
      {
        cwd: fileURLToPath(new URL("..", import.meta.url)),
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(
              ([nombre]) => !nombre.startsWith("TALLER_"),
            ),
          ),
          TALLER_DATOS: datos,
          TALLER_SMTP_HOST: "127.0.0.1",
          TALLER_SMTP_PUERTO: String(puerto),
          TALLER_SMTP_USUARIO: "taller@example.invalid",
          TALLER_SMTP_CLAVE: "ficticia",
          TALLER_EMAIL_COPIA: "copia@example.invalid",
          TALLER_URL_PUBLICA: "https://taller.example.invalid",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let salida = "";
    let errores = "";
    proceso.stdout!.on("data", (chunk) => {
      salida += chunk.toString();
    });
    proceso.stderr!.on("data", (chunk) => {
      errores += chunk.toString();
    });
    const [codigo] = await once(proceso, "exit");
    expect(codigo, errores).toBe(0);
    const orden = JSON.parse(salida);
    expect(orden.email_estado).toBe("enviado");
    expect(destinatarios).toContain("RCPT TO:<cliente@example.invalid>");
    expect(destinatarios).toContain("RCPT TO:<copia@example.invalid>");
    expect(mensaje).toContain("Content-Type: application/pdf");
    expect(mensaje).toContain(`${orden.numero}.pdf`);
    expect(mensaje.replace(/=\r\n/g, "")).toContain(
      `https://taller.example.invalid/s/${orden.token}`,
    );
    const adjunto = mensaje.match(
      /Content-Type: application\/pdf[\s\S]*?\r\n\r\n([\s\S]*?)\r\n--/,
    );
    expect(adjunto).not.toBeNull();
    expect(Buffer.from(adjunto![1]!, "base64").subarray(0, 5).toString()).toBe("%PDF-");
  } finally {
    if (proceso && proceso.exitCode === null && proceso.signalCode === null) {
      const salida = once(proceso, "exit");
      const forzar = setTimeout(() => proceso?.kill("SIGKILL"), 2000);
      proceso.kill();
      try {
        await salida;
      } finally {
        clearTimeout(forzar);
      }
    }
    for (const socket of sockets) socket.destroy();
    if (smtp.listening) await new Promise<void>((resolve) => smtp.close(() => resolve()));
    rmSync(datos, { recursive: true, force: true });
  }
}, 30000);
