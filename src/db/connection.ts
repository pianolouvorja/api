import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function initDb(): void {
  const dbPath = process.env.DB_PATH ?? "./data/catalog.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Rodar migrations — tentar multiplos caminhos (dev e build)
  const candidates = [
    join(__dirname, "db", "migrations"),
    join(process.cwd(), "src", "db", "migrations"),
    join(process.cwd(), "db", "migrations"),
  ];

  let migrationsDir: string | null = null;
  for (const dir of candidates) {
    if (existsSync(dir)) {
      migrationsDir = dir;
      break;
    }
  }

  if (!migrationsDir) {
    console.log("Sem migrations para aplicar (diretorio nao encontrado)");
    return;
  }

  const files = readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    try {
      db!.exec(sql);
    } catch (e: any) {
      // Ignorar erros de coluna duplicada ou tabela inexistente em migrations idempotentes
      if (
        !e.message?.includes("duplicate column name") &&
        !e.message?.includes("no such table")
      ) {
        throw e;
      }
    }
  }
  console.log(`${files.length} migrations aplicadas`);
}

export function getDb(): Database.Database {
  if (!db) throw new Error("DB nao inicializado. Chame initDb() primeiro.");
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDbStats() {
  if (!db) return { sizeBytes: 0, tableCount: 0 };
  const result = db
    .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'")
    .get() as { count: number };

  const pageSize = db.pragma("page_size", { simple: true }) as number;
  const pageCount = db.pragma("page_count", { simple: true }) as number;

  return {
    sizeBytes: pageSize * pageCount,
    tableCount: result.count,
  };
}
