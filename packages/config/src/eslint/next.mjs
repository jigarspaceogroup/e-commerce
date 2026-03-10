import baseConfig from "./base.mjs";

/** @type {import("eslint").Linter.Config[]} */
const nextConfig = [
  ...baseConfig,
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Next.js specific rules
      // These will be fully active when @next/eslint-plugin-next is installed in the app
      "no-html-link-for-pages": "off",
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
  {
    // Next.js specific file patterns
    files: ["**/*.tsx", "**/*.jsx"],
    rules: {
      // Allow default exports for pages and layouts
      "import/no-default-export": "off",
    },
  },
  {
    ignores: [".next/**", "next-env.d.ts"],
  },
];

export default nextConfig;
