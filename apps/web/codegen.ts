import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  generates: {
    "lib/graphql/portal/schema-types.ts": {
      schema: "portal-schema.graphql",
      documents: ["lib/graphql/portal/*.graphql"],
      plugins: ["typescript"],
      config: { scalars: { UUID: "string", JSON: "unknown" } },
    },
    "lib/graphql/portal/generated.ts": {
      schema: "portal-schema.graphql",
      documents: ["lib/graphql/portal/*.graphql"],
      plugins: ["typescript-operations", "typed-document-node"],
      config: { scalars: { UUID: "string", JSON: "unknown" } },
    },
    "lib/graphql/schema-types.ts": {
      schema: "schema.graphql",
      documents: ["lib/graphql/*.graphql"],
      plugins: ["typescript"],
      config: { scalars: { UUID: "string", Date: "string", DateTime: "string", JSON: "unknown" } },
    },
    "lib/graphql/generated.ts": {
      schema: "schema.graphql",
      documents: ["lib/graphql/*.graphql"],
      plugins: ["typescript-operations", "typed-document-node"],
      config: {
        importSchemaTypesFrom: "lib/graphql/schema-types",
        scalars: { UUID: "string", Date: "string", DateTime: "string", JSON: "unknown" },
      },
    },
  },
};
export default config;
