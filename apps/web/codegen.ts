import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema.graphql",
  documents: ["lib/graphql/*.graphql"],
  generates: {
    "lib/graphql/schema-types.ts": {
      plugins: ["typescript"],
      config: { scalars: { UUID: "string", Date: "string", DateTime: "string", JSON: "unknown" } },
    },
    "lib/graphql/generated.ts": {
      plugins: ["typescript-operations", "typed-document-node"],
      config: {
        importSchemaTypesFrom: "lib/graphql/schema-types",
        scalars: { UUID: "string", Date: "string", DateTime: "string", JSON: "unknown" },
      },
    },
  },
};
export default config;
