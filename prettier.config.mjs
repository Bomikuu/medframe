export default {
  printWidth: 100,
  tabWidth: 2,
  trailingComma: "all",
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./apps/web/app/globals.css",
  tailwindFunctions: ["cn", "cva"],
};
