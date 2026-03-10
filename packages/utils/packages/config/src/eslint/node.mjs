import baseConfig from "./base.mjs";

export default [
  ...baseConfig,
  {
    rules: {
      // Node.js specific rules
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
];
