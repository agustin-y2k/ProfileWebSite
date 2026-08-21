/**
 * Genera el valor de `TALLER_PASSWORD_HASH`.
 *
 *   docker compose run --rm taller node --import tsx src/hash.ts 'mi contraseña'
 *
 * La contraseña en claro no se guarda en ningún lado: lo que va al `.env` es
 * el hash, y de ahí no se puede volver atrás.
 */
import { hashDeContrasena } from "./auth";

const contrasena = process.argv[2];

if (!contrasena) {
  console.error(
    "Uso: node --import tsx src/hash.ts 'la contraseña que elijas'\n" +
      "El texto entre comillas ES la contraseña, no un ejemplo a copiar.",
  );
  process.exit(1);
}

console.log(hashDeContrasena(contrasena));
