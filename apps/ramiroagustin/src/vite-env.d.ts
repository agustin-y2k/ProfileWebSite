/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

/** Año en que se compiló el sitio. Lo inyecta vite.config.ts. */
declare const __BUILD_YEAR__: number;
