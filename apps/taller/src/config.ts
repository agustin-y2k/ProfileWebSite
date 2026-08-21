import { resolve } from "node:path";

/**
 * Configuración por variables de entorno, con valores por defecto que sirven
 * para correrlo en la máquina de desarrollo sin preparar nada.
 *
 * En la Pi, `TALLER_DATOS` apunta a un volumen de Docker: es la única carpeta
 * cuyo contenido tiene que sobrevivir a un `docker compose up --build`.
 */
const datos = resolve(process.env["TALLER_DATOS"] ?? "./datos");

function texto(nombre: string): string {
  return (process.env[nombre] ?? "").trim();
}

export const config = {
  puerto: Number(process.env["TALLER_PUERTO"] ?? 3100),
  /** 0.0.0.0 y no localhost: adentro de un contenedor, escuchar solo en la
   *  interfaz de loopback lo deja inalcanzable desde la red de Docker. */
  host: process.env["TALLER_HOST"] ?? "0.0.0.0",

  datos,
  baseDeDatos: resolve(datos, "taller.db"),
  /** Fotos y PDFs. Van al disco y no a la base: un blob de varios MB por orden
   *  infla el archivo de SQLite sin ganar nada a cambio. */
  archivos: resolve(datos, "archivos"),

  /**
   * Todo lo que se muestra y el número de orden se calculan en hora argentina.
   * Si se usara UTC, una orden cargada el 31 de diciembre a las 21:30 quedaría
   * numerada con el año siguiente.
   */
  zonaHoraria: "America/Argentina/Buenos_Aires",

  /**
   * Días que se conservan las fotos sueltas después de entregado el equipo.
   *
   * Se cuenta desde la entrega y no desde "lista para retirar": un equipo
   * puede quedar listo y retirarse tres semanas después, y borrar la evidencia
   * mientras todavía puede haber un reclamo sería justo al revés. El equipo
   * que nunca se retira conserva sus fotos para siempre.
   *
   * Es configurable sobre todo para poder probarlo con 0.
   */
  diasDeFotos: Number(process.env["TALLER_DIAS_FOTOS"] ?? 30),

  // ── Acceso ────────────────────────────────────────────────────────────────
  /**
   * `TALLER_AUTH=off` apaga la autenticación por completo. Solo tiene sentido
   * en `compose.local.yml`, donde el puerto está atado a 127.0.0.1. El
   * servidor avisa en cada arranque para que nunca pase inadvertido.
   */
  autenticar: texto("TALLER_AUTH") !== "off",
  /** Generar con: docker compose run --rm taller node --import tsx src/hash.ts 'clave' */
  contrasenaHash: texto("TALLER_PASSWORD_HASH"),

  /**
   * URL pública del taller, para armar el enlace de seguimiento que va en el
   * correo. Vacía mientras el subdominio no esté publicado: el correo sale
   * igual, solo que sin el enlace.
   */
  urlPublica: texto("TALLER_URL_PUBLICA").replace(/\/+$/, ""),

  // ── Correo ────────────────────────────────────────────────────────────────
  /**
   * Gmail con contraseña de aplicación (requiere tener el 2FA activado en la
   * cuenta). Con `usuario` vacío no se manda nada y las órdenes quedan
   * marcadas como "sin configurar": el sistema sigue funcionando entero.
   */
  smtp: {
    host: texto("TALLER_SMTP_HOST") || "smtp.gmail.com",
    puerto: Number(process.env["TALLER_SMTP_PUERTO"] ?? 465),
    usuario: texto("TALLER_SMTP_USUARIO"),
    clave: texto("TALLER_SMTP_CLAVE"),
    /** Nombre visible del remitente. La dirección es la del usuario SMTP. */
    nombre: texto("TALLER_EMAIL_NOMBRE") || "ByteFix",
    /** Copia oculta para uno mismo: queda en Recibidos, no solo en Enviados. */
    copia: texto("TALLER_EMAIL_COPIA"),
  },
} as const;

export const correoConfigurado = config.smtp.usuario !== "" && config.smtp.clave !== "";
