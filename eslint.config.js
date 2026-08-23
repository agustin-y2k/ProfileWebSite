import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  { ignores: ["**/dist", "**/dist-ssr", "**/node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, __BUILD_YEAR__: "readonly" },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Los scripts de build corren en Node, no en el navegador.
  {
    files: ["**/scripts/*.mjs", "**/*.config.ts"],
    languageOptions: { globals: globals.node },
  },
  // El taller es un servicio de servidor entero: nada de su código toca el DOM.
  {
    files: ["apps/taller/src/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
);
