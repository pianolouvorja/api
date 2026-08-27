import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

describe("src/index.ts — bootstrap do servidor", () => {
  afterAll(() => {
    vi.resetModules();
  });

  it("inicia servidor, aplica migrations e loga a porta", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "index-bootstrap-"));
    process.env.DB_PATH = join(tmp, "catalog.db");
    delete process.env.PORT; // fallback PORT ?? 3100

    const serveMock = vi.fn(
      (_opts: unknown, cb: (info: { port: number }) => void) => {
        cb({ port: 3100 });
        return { close: () => {} };
      },
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.doMock("@hono/node-server", () => ({ serve: serveMock }));

    await import("../../src/index.js");

    expect(serveMock).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("piano-api rodando na porta 3100");
    expect(serveMock).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
    errSpy.mockRestore();
    vi.doUnmock("@hono/node-server");
    vi.resetModules();
    delete process.env.DB_PATH;
    delete process.env.PORT;
    rmSync(tmp, { recursive: true, force: true });
  });
});
