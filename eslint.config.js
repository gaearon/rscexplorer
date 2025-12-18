// @ts-check

import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { noMixedClassPrefixes } from "./eslint/no-mixed-class-prefixes.js";

export default defineConfig([
  {
    ignores: ["node_modules/", "dist/"],
  },
  {
    files: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
  },
  reactHooks.configs.flat.recommended,
  tseslint.configs.base,
  {
    files: ["**/*.tsx", "**/*.jsx"],
    plugins: {
      local: {
        rules: {
          "no-mixed-class-prefixes": noMixedClassPrefixes,
        },
      },
    },
    rules: {
      "local/no-mixed-class-prefixes": "error",
    },
  },
]);
