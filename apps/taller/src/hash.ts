/**
 * Genera el valor de `TALLER_PASSWORD_HASH`.
 *
 *   docker compose run --rm taller node --import tsx src/hash.ts
 *
 * Pregunta la contraseña sin mostrarla en pantalla. Se puede pasar también
 * como argumento —útil para scripts—, pero por esa vía queda en el historial
 * del shell y visible en `ps` mientras el proceso corre, así que el modo
 * interactivo es el recomendado.
 *
 * La contraseña en claro no se guarda en ningún lado: lo que va al `.env` es
 * el hash, y de ahí no se puede volver atrás.
 */
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { hashDeContrasena } from "./auth";

function preguntar(mensaje: string): Promise<string> {
  return new Promise((resolver) => {
    const lector = createInterface({ input: stdin, output: stdout, terminal: true });

    lector.question(mensaje, (valor) => {
      lector.close();
      stdout.write("\n");
      resolver(valor);
    });

    // El silenciador va DESPUÉS de `question()`, no antes: readline redibuja
    // la línea al arrancar y borra cualquier cosa escrita de antemano. Puesto
    // acá, el mensaje alcanza a dibujarse y lo único que se oculta es el eco
    // de las teclas. `_writeToOutput` es API interna, pero es la única forma
    // de ocultar la entrada sin sumar una dependencia solo para esto.
    (lector as unknown as { _writeToOutput: (texto: string) => void })._writeToOutput =
      () => {};
  });
}

const desdeArgumento = process.argv[2];

if (desdeArgumento) {
  console.log(hashDeContrasena(desdeArgumento));
} else if (!stdin.isTTY) {
  console.error(
    "No hay terminal para preguntar la contraseña.\n" +
      "Con `docker compose run` funciona; con `-T` o dentro de un script, pasala\n" +
      "como argumento: node --import tsx src/hash.ts 'LA-QUE-ELIJAS'",
  );
  process.exit(1);
} else {
  const contrasena = await preguntar("Contraseña nueva: ");

  if (contrasena.length < 8) {
    console.error("\nDemasiado corta: poné al menos 8 caracteres.");
    process.exit(1);
  }

  // Se pide dos veces porque no se ve lo que se escribe: un dedo corrido acá
  // significa descubrir el error recién en la pantalla de login, con el hash
  // ya pegado en el .env y el contenedor reiniciado.
  const otraVez = await preguntar("Repetila: ");

  if (contrasena !== otraVez) {
    console.error("\nNo coinciden. No se generó nada.");
    process.exit(1);
  }

  console.log("\nPegá esta línea en el .env:\n");
  console.log(`TALLER_PASSWORD_HASH=${hashDeContrasena(contrasena)}`);
  console.log("\nY después: docker compose up -d taller");
}
