import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],

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
    cssCodeSplit: false, // una sola landing: un solo CSS evita un request extra
    reportCompressedSize: false,
    rollupOptions: {
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
