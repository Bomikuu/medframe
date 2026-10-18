import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema.graphql",
  documents: ["lib/graphql/*.graphql"],
  generates: {
    "lib/graphql/generated.ts": {
      plugins: ["typescript", "typescript-operations", "typed-document-node"],
      config: { scalars: { UUID: "string" } },
    },
  },
};
export default config;
