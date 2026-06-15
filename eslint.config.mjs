import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    files: ["src/app/actions/**/*.{ts,tsx}", "src/app/api/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "next.config.js",
    "public/sw.js",
    "public/workbox-*.js",
    "scratch/**",
    "scripts/**",
    "tests/**",
    "prisma/seed.ts",
    "scratch_*.ts",
    "test-*.ts",
  ]),
]);

export default eslintConfig;
