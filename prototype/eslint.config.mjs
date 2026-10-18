import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";
export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "*.bundle.*",
      "assets/**",
      "history/**",
      "presentation/public/**",
      "presentation/src/vendor/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    files: [
      "src/**/*.{js,jsx}",
      "presentation/src/**/*.{ts,mjs}",
      "tests/**/*.mjs",
      "scripts/**/*.mjs",
      "*.mjs",
      "history-gesture.js",
    ],
    languageOptions: {
      parser: ts.parser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "@typescript-eslint": ts.plugin },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "none", ignoreRestSiblings: true },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  { files: ["**/*.ts"], rules: { "no-undef": "off" } },
];
