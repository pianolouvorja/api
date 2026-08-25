import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// Cobrir branches de initDb: migrations dir ausente (33-34) e rethrow de
// erro de migration nao ignoravel (51).
describe("initDb — branches de erro", () => {
  it("sem diretorio de migrations → loga e retorna sem aplicar", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "piano-nomig-"));
    process.env.DB_PATH = join(tmp, "no-migrations.db");
    vi.resetModules();

    vi.doMock("node:fs", async () => {
      const actual: typeof import("node:fs") = await vi.importActual("node:fs");
      return {
        ...actual,
        existsSync: (p: any) => {
          // esconde TODOS os candidatos de diretorio de migrations
          if (typeof p === "string" && p.includes("migrations")) return false;
          return actual.existsSync(p);
        },
      };
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { initDb } = await import("../../src/db/connection.js");
    expect(() => initDb()).not.toThrow();
    expect(logSpy).toHaveBeenCalledWith(
      "Sem migrations para aplicar (diretorio nao encontrado)",
    );
    logSpy.mockRestore();
    vi.doUnmock("node:fs");
    rmSync(tmp, { recursive: true, force: true });
  });

  it("migration com SQL invalido → rethrow (erro nao ignoravel)", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "piano-badsql-"));
    process.env.DB_PATH = join(tmp, "bad.db");
    vi.resetModules();

    vi.doMock("node:fs", async () => {
      const actual: typeof import("node:fs") = await vi.importActual("node:fs");
      return {
        ...actual,
        readFileSync: (p: any, ...rest: any[]) => {
          if (typeof p === "string" && p.endsWith(".sql")) {
            return "CREATE TABELA___sql_invalido(((";
          }
          return actual.readFileSync(p, ...rest);
        },
      };
    });

    const { initDb } = await import("../../src/db/connection.js");
    expect(() => initDb()).toThrow(/syntax|invalid|error/i);
    vi.doUnmock("node:fs");
    rmSync(tmp, { recursive: true, force: true });
  });
});
