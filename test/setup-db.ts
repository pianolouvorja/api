import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Cada worker do vitest ganha seu proprio DB temporario, evitando
 * SQLITE_BUSY quando os test files de integracao rodam em paralelo
 * sobre o mesmo ./data/catalog.db.
 */
const dbPath = join(tmpdir(), `plj-api-test-${process.pid}.db`);
rmSync(dbPath, { force: true });
process.env.DB_PATH = dbPath;

process.on("exit", () => {
  rmSync(dbPath, { force: true });
});
