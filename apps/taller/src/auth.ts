import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { config } from "./config";

/**
 * Acceso al panel: una sola contraseña, la de Ramiro.
 *
 * Esto es la segunda capa, no la única. La primera es Cloudflare Access
 * delante del subdominio, que hace que el tráfico anónimo ni siquiera llegue a
 * la Pi. Un formulario de login expuesto a internet desde una conexión
 * hogareña es un blanco de fuerza bruta; con Access adelante, no lo es.
 */

/**
 * El separador es `:` y no el `$` de la convención de crypt(3) de Unix.
 *
 * Este valor viaja en un archivo `.env` que lee Docker Compose, y Compose
 * interpola `$` ahí adentro: con `scrypt$sal$hash`, la sal se toma como el
 * nombre de una variable y se reemplaza por vacío, en silencio. El hash llega
 * mutilado al contenedor y el login falla sin ninguna pista de por qué.
 */
const ALGORITMO = "scrypt";
const SEPARADOR = ":";
const LARGO_CLAVE = 64;

export function hashDeContrasena(contrasena: string): string {
  const sal = randomBytes(16);
  const derivada = scryptSync(contrasena.normalize("NFC"), sal, LARGO_CLAVE);
  return [ALGORITMO, sal.toString("hex"), derivada.toString("hex")].join(SEPARADOR);
}

export function contrasenaValida(contrasena: string): boolean {
  const partes = config.contrasenaHash.split(SEPARADOR);
  if (partes.length !== 3 || partes[0] !== ALGORITMO) return false;

  const sal = Buffer.from(partes[1] ?? "", "hex");
  const esperada = Buffer.from(partes[2] ?? "", "hex");
  if (sal.length === 0 || esperada.length !== LARGO_CLAVE) return false;

  const derivada = scryptSync(contrasena.normalize("NFC"), sal, LARGO_CLAVE);
  // Comparación de tiempo constante: comparar con `===` filtra por cuánto
  // tarda en fallar cuántos caracteres iniciales eran correctos.
  return timingSafeEqual(derivada, esperada);
}

/**
 * La clave con la que se firman las sesiones sale del hash de la contraseña.
 *
 * Así no hace falta un secreto más en el `.env`, las sesiones sobreviven a un
 * reinicio del contenedor, y cambiar la contraseña cierra automáticamente
 * todas las sesiones abiertas —que es exactamente lo que se quiere si la razón
 * del cambio es que el teléfono se perdió—.
 */
function claveDeFirma(): Buffer {
  return createHmac("sha256", "taller-sesion").update(config.contrasenaHash).digest();
}

const DURACION_MS = 30 * 24 * 60 * 60 * 1000;
export const COOKIE = "taller_sesion";

export function crearSesion(): string {
  const expira = Date.now() + DURACION_MS;
  const firma = createHmac("sha256", claveDeFirma())
    .update(String(expira))
    .digest("base64url");
  return `${expira}.${firma}`;
}

export function sesionValida(valor: string | undefined): boolean {
  if (!valor) return false;

  const corte = valor.indexOf(".");
  if (corte < 1) return false;

  const expira = Number(valor.slice(0, corte));
  if (!Number.isFinite(expira) || expira < Date.now()) return false;

  const recibida = Buffer.from(valor.slice(corte + 1), "base64url");
  const esperada = createHmac("sha256", claveDeFirma()).update(String(expira)).digest();
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}

export function leerCookie(
  cabecera: string | undefined,
  nombre: string,
): string | undefined {
  if (!cabecera) return undefined;
  for (const parte of cabecera.split(";")) {
    const igual = parte.indexOf("=");
    if (igual < 0) continue;
    if (parte.slice(0, igual).trim() === nombre) {
      return decodeURIComponent(parte.slice(igual + 1).trim());
    }
  }
  return undefined;
}

export function armarCookie(
  valor: string,
  segura: boolean,
  duracionSegundos: number,
): string {
  const partes = [
    `${COOKIE}=${encodeURIComponent(valor)}`,
    "Path=/",
    "HttpOnly",
    // Lax y no Strict: con Strict, entrar desde el enlace de un correo
    // mostraría la pantalla de login aunque la sesión estuviera abierta.
    "SameSite=Lax",
    `Max-Age=${duracionSegundos}`,
  ];
  if (segura) partes.push("Secure");
  return partes.join("; ");
}

/**
 * Freno de fuerza bruta en memoria.
 *
 * No hace falta persistirlo: reiniciar el proceso para limpiar el contador
 * exige ya tener acceso a la Pi, y en ese caso la contraseña del panel es el
 * menor de los problemas.
 */
const intentos = new Map<string, { fallos: number; hasta: number }>();
const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

export function bloqueado(ip: string): boolean {
  const registro = intentos.get(ip);
  if (!registro) return false;
  if (registro.hasta < Date.now()) {
    intentos.delete(ip);
    return false;
  }
  return registro.fallos >= MAX_FALLOS;
}

export function registrarFallo(ip: string): void {
  const registro = intentos.get(ip) ?? { fallos: 0, hasta: 0 };
  registro.fallos += 1;
  registro.hasta = Date.now() + BLOQUEO_MS;
  intentos.set(ip, registro);
}

export function limpiarIntentos(ip: string): void {
  intentos.delete(ip);
}
