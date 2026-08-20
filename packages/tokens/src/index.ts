/**
 * Breakpoints compartidos.
 *
 * Se declaran acá en TS —y no solo en CSS— porque los hooks de layout
 * (`useMediaQuery`) necesitan la misma fuente de verdad que las media queries.
 * Duplicar el valor entre CSS y JS es cómo se desincronizan los layouts.
 */
export const breakpoints = {
  sm: "30rem", // 480px
  md: "48rem", // 768px
  lg: "64rem", // 1024px
  xl: "80rem", // 1280px
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** `media.up("md")` → "(min-width: 48rem)" */
export const media = {
  up: (bp: Breakpoint) => `(min-width: ${breakpoints[bp]})`,
  down: (bp: Breakpoint) => `(max-width: calc(${breakpoints[bp]} - 0.02px))`,
} as const;
