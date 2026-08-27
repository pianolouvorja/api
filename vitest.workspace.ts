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
      // Arquivos em série, cada um no próprio fork: isola o singleton
      // do better-sqlite3 (evita crash nativo no teardown com workers paralelos)
      fileParallelism: false,
      pool: "forks",
      poolOptions: {
        forks: {
          singleFork: false,
        },
      },
    },
  },
]);
