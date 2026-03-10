import baseConfig from "./base.mjs";

export default [
  ...baseConfig,
  {
    rules: {
      // Next.js specific overrides can be added here
      // The @next/eslint-plugin-next rules will be added by each app
    },
  },
];
