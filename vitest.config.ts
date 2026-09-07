import { defineConfig } from "vitest/config";

/* Una sola corrida para todo el monorepo. Los tests viven al lado del archivo
   que prueban y no en un árbol `__tests__` aparte: así se ven al abrir la
   carpeta, y el que cambia el código tropieza con su prueba sin buscarla.

   El entorno es `node`, el de por sí: lo que se prueba hasta ahora es lógica
   sin DOM. El día que haya que montar un componente, ese archivo pide su
   entorno con un comentario `@vitest-environment jsdom` arriba de todo, en vez
   de hacer que toda la suite cargue un DOM que no usa. */
export default defineConfig({
  test: {
    include: ["{apps,packages}/*/src/**/*.test.ts"],
  },
});
