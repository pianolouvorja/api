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
      // Cada arquivo de teste roda em seu proprio processo (fork)
      // Isola o singleton DB e elimina SQLITE_BUSY
      pool: "forks",
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
    },
  },
]);
