import { renderToString } from "react-dom/server";
import { App } from "./App";
import "./styles/global.css";

/** Invocado por scripts/prerender.mjs durante el build. Nunca en runtime. */
export function render(): string {
  return renderToString(<App />);
}
