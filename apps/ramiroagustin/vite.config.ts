import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const raiz = dirname(fileURLToPath(import.meta.url));

/**
 * Las páginas del sitio. Cada una es un index.html propio, no una ruta de un
 * router: el sitio se sirve como estáticos desde nginx y se prerenderiza en el
 * build, así que una página de verdad es un archivo de verdad.
 *
 * La ganancia principal no es el SEO —eso ya lo daba el prerender— sino que
 * cada página arrastra solo su propio JavaScript. La portada no puede engordar
 * por algo que se agregue en /algoritmos/, porque ni siquiera está en su grafo
 * de módulos.
 */
const PAGINAS = {
  inicio: resolve(raiz, "index.html"),
  algoritmos: resolve(raiz, "algoritmos/index.html"),
};

/**
 * Inyecta el script de analítica solo si está configurado.
 *
 * Las dos variables llegan como build args del Dockerfile. Si falta alguna
 * —por ejemplo en desarrollo, o antes de dar de alta el sitio en Umami— no se
 * inyecta nada: el HTML sale limpio en vez de con un <script> apuntando a una
 * URL vacía que el navegador intentaría cargar igual.
 *
 * Va como etiqueta en el HTML y no como import del bundle para que la
 * analítica no forme parte del JavaScript de la aplicación: si el script de
 * terceros se cae o lo bloquea un adblocker, la página no se entera.
 */
function analytics(): Plugin {
  return {
    name: "inyectar-analitica",
    transformIndexHtml() {
      const src = process.env.VITE_ANALYTICS_SRC;
      const id = process.env.VITE_ANALYTICS_ID;
      if (!src || !id) return [];

      return [
        {
          tag: "script",
          attrs: { defer: true, src, "data-website-id": id },
          injectTo: "head" as const,
        },
      ];
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), analytics()],

  css: {
    modules: {
      // Nombre explícito y determinista: el build de cliente y el de SSR se
      // ejecutan por separado, y si generaran hashes distintos las clases del
      // HTML prerenderizado no coincidirían con las del CSS y React
      // reportaría un mismatch de hidratación.
      generateScopedName: "[name]_[local]_[hash:base64:5]",
    },
  },

  define: {
    // El prerender corre en el build y la hidratación en el navegador: si el
    // año se calculara en ambos lados, un sitio compilado en diciembre y
    // visitado en enero daría distinto y React reportaría un mismatch.
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },

  build: {
    target: "es2020",
    // Partido desde que hay más de una página: con un CSS único, la portada
    // cargaría también el del visualizador de algoritmos, que es justo lo que
    // separar en páginas existe para evitar. Sigue siendo un request por
    // página, solo que ahora cada una pide el suyo.
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      // El build de SSR recibe su entrada por línea de comandos
      // (`vite build --ssr src/entry-server.tsx`), así que no lleva input acá.
      input: isSsrBuild ? undefined : PAGINAS,
      output: isSsrBuild
        ? // El bundle de SSR lo importa scripts/prerender.mjs por ruta fija,
          // así que no lleva hash: es un artefacto temporal del build.
          { entryFileNames: "[name].js" }
        : {
            // Hash en el nombre: habilita el `Cache-Control: immutable` de nginx.
            assetFileNames: "assets/[name]-[hash][extname]",
            chunkFileNames: "assets/[name]-[hash].js",
            entryFileNames: "assets/[name]-[hash].js",
          },
    },
  },

  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
}));
