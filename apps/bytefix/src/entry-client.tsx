import { hydrateRoot } from "react-dom/client";
import { restoreHashPosition } from "@sites/ui";
import { App } from "./App";
import "./styles/global.css";

const root = document.getElementById("root");
if (root) {
  hydrateRoot(root, <App />);
  restoreHashPosition();
}
