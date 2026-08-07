import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "unit",
      environment: "node",
      include: ["test/unit/**/*.test.ts"],
    },
  },
  {
    test: {
      name: "integration",
      environment: "node",
      include: ["test/integration/**/*.test.ts"],
      // SQLite nao suporta multiplos escritores em paralelo no mesmo arquivo
      fileParallelism: false,
    },
  },
]);
