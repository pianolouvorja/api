import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Cada execucao de setup (por test file) ganha seu proprio DB temporario,
 * evitando SQLITE_BUSY quando os test files de integracao rodam em paralelo
 * (workers do vitest compartilham o mesmo process.pid, entao UUID e necessario).
 */
const dbPath = join(tmpdir(), `plj-api-test-${randomUUID()}.db`);
process.env.DB_PATH = dbPath;

process.on("exit", () => {
  rmSync(dbPath, { force: true });
});
