import { site } from "@sites/negocio";
import { html, type Html } from "../html";

type Opciones = {
  titulo: string;
  /** Enlace de la flecha de volver. Sin esto no se dibuja. */
  volver?: string;
  contenido: Html;
};

export function layout({ titulo, volver, contenido }: Opciones): string {
  return `<!doctype html>${
    html`
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <!-- El panel no tiene por qué aparecer en ningún buscador. -->
          <meta name="robots" content="noindex, nofollow" />
          <title>${titulo} · ${site.name} Taller</title>
          <link rel="stylesheet" href="/estilos.css" />
        </head>
        <body>
          <header class="barra">
            ${
              volver
                ? html`<a class="volver" href="${volver}" aria-label="Volver">←</a>`
                : ""
            }
            <span class="marca">${site.name}</span>
            <span class="seccion">${titulo}</span>
          </header>
          <main class="contenido">${contenido}</main>
        </body>
      </html>
    `.html
  }`;
}
