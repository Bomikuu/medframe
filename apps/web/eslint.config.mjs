import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-rehearsal/**",
    ".next-batch2-rehearsal/**",
    ".next-batch3-rehearsal/**",
    ".next-ui-revamp/**",
    ".next-anatomical-dental/**",
    ".next-dental-editor/**",
    ".next-dental-reference/**",
    ".next-login-enhancements/**",
    ".next-batch1-checkpoint/**",
    "public/vendor/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
