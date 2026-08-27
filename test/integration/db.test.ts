import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../../src/db/connection.js";
import { closeIsolatedDb, openIsolatedDb } from "../helpers/catalog.js";

describe("DB Connection", () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = openIsolatedDb("integration");
  });

  afterEach(() => {
    closeIsolatedDb(dbPath);
  });

  it("deve conectar no SQLite", () => {
    const db = getDb();
    expect(db).toBeDefined();
    expect(db.open).toBe(true);
  });

  it("deve ter todas as 11 tabelas", () => {
    const db = getDb();
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as { name: string }[];

    const tableNames = tables
      .map((t) => t.name)
      .filter((n) => !n.startsWith("sqlite_"));
    expect(tableNames).toContain("languages");
    expect(tableNames).toContain("files");
    expect(tableNames).toContain("albums");
    expect(tableNames).toContain("musics");
    expect(tableNames).toContain("lyrics");
    expect(tableNames).toContain("albums_musics");
    expect(tableNames).toContain("categories");
    expect(tableNames).toContain("categories_albums");
    expect(tableNames).toContain("bible_versions");
    expect(tableNames).toContain("bible_books");
    expect(tableNames).toContain("bible_verses");
    expect(tableNames).toContain("ccb_hymns");
    expect(tableNames).toContain("licenses");
  });

  it("deve inserir e consultar linguagem", () => {
    const db = getDb();
    db.prepare(
      "INSERT OR IGNORE INTO languages (id_language, name) VALUES (?, ?)",
    ).run("pt", "Portugues");
    const result = db
      .prepare("SELECT * FROM languages WHERE id_language = ?")
      .get("pt") as { id_language: string };
    expect(result.id_language).toBe("pt");
  });
});
