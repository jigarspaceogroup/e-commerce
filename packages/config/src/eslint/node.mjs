import baseConfig from "./base.mjs";

/** @type {import("eslint").Linter.Config[]} */
const nodeConfig = [
  ...baseConfig,
  {
    rules: {
      // Node.js specific rules
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-process-exit": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: ["dist/**", "build/**"],
  },
];

export default nodeConfig;
