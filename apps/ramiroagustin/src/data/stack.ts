export type StackEntry = {
  group: string;
  items: readonly { name: string; note: string }[];
};

/** Lo que hace funcionar a esta misma página. */
export const stack: readonly StackEntry[] = [
  {
    group: "Frontend",
    items: [
      { name: "React 19 + TypeScript", note: "en modo estricto" },
      { name: "Vite", note: "build y dev server" },
      { name: "CSS Modules", note: "sobre tokens de diseño propios" },
    ],
  },
  {
    group: "Entrega",
    items: [
      { name: "Prerender", note: "HTML completo en el build, sin servidor" },
      { name: "Monorepo pnpm", note: "UI compartida con bytefix.shop" },
      { name: "Docker multi-stage", note: "imagen final solo con nginx" },
    ],
  },
  {
    group: "Infraestructura",
    items: [
      { name: "Raspberry Pi 4", note: "self-hosting en casa" },
      { name: "nginx alpine", note: "estáticos, gzip y cabeceras" },
      { name: "Cloudflare Tunnel", note: "sin puertos abiertos a internet" },
    ],
  },
];
