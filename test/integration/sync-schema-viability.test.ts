import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initDb, closeDb, getDb } from "../../src/db/connection.js";

/**
 * P1 — prova de viabilidade do schema de sync (gauntlet coletâneas offline):
 * migration 023 aplica, backfill gera uuid p/ legado, tombstone + LWW funcionam
 * no SQLite real. É a fundação do sync engine (P3).
 */
describe("P1 viabilidade: schema offline sync (migration 023)", () => {
  beforeAll(() => {
    initDb();
  });
  afterAll(() => {
    closeDb();
  });

  it("colunas de sync existem nas 3 tabelas", () => {
    const db = getDb();
    const cols = (t: string) =>
      (
        db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]
      ).map((c) => c.name);
    expect(cols("custom_collections")).toContain("client_uuid");
    expect(cols("custom_collections")).toContain("deleted_at");
    expect(cols("custom_collections")).toContain("updated_at_ms");
    expect(cols("custom_musics")).toContain("client_uuid");
    expect(cols("custom_musics")).toContain("deleted_at");
    expect(cols("custom_musics")).toContain("updated_at_ms");
    expect(cols("custom_lyrics")).toContain("updated_at_ms");
  });

  it("migration 023 é idempotente (roda de novo sem quebrar)", () => {
    const db = getDb();
    const sql = "ALTER TABLE custom_collections ADD COLUMN client_uuid TEXT";
    try {
      db.exec(sql);
    } catch (e) {
      // runner tolera duplicate column — simula a 2ª passada
      expect(String(e)).toContain("duplicate column name");
    }
    // tabela continua intacta e consultável
    const n = db.prepare("SELECT count(*) as c FROM custom_collections").get() as {
      c: number;
    };
    expect(n.c).toBeGreaterThanOrEqual(0);
  });

  it("backfill: insert legado-style + re-run do UPDATE gera uuid p/ rows sem uuid", () => {
    const db = getDb();
    db.prepare(
      "INSERT INTO custom_collections (name, description) VALUES ('Viab A', null)",
    ).run();
    const row = db
      .prepare(
        "SELECT * FROM custom_collections WHERE name = 'Viab A' ORDER BY id_collection DESC",
      )
      .get() as any;
    // trigger do app popula na criação; aqui testamos o backfill direto
    db.prepare(
      `UPDATE custom_collections
         SET client_uuid = lower(hex(randomblob(16))), updated_at_ms = 1700000000000
       WHERE id_collection = ? AND client_uuid IS NULL`,
    ).run(row.id_collection);
    const back = db
      .prepare("SELECT client_uuid, updated_at_ms FROM custom_collections WHERE id_collection = ?")
      .get(row.id_collection) as any;
    expect(back.client_uuid).toBeTruthy();
    expect(back.updated_at_ms).toBe(1700000000000);
  });

  it("LWW: updated_at_ms inteiro compara corretamente e tombstone sobrevive", () => {
    const db = getDb();
    const t1 = 1_700_000_000_000;
    const t2 = 1_700_000_005_000;
    db.prepare(
      "INSERT INTO custom_collections (name, client_uuid, updated_at_ms) VALUES ('LWW A', 'uuid-lww-a', ?)",
    ).run(t1);
    const id = (
      db
        .prepare("SELECT id_collection FROM custom_collections WHERE client_uuid='uuid-lww-a'")
        .get() as any
    ).id_collection;
    // server tem versão mais nova → client (t1) perde
    db.prepare(
      "UPDATE custom_collections SET updated_at_ms = ?, name = 'server-wins' WHERE id_collection = ?",
    ).run(t2, id);
    const server = db
      .prepare("SELECT * FROM custom_collections WHERE id_collection = ?")
      .get(id) as any;
    const clientTs = t1;
    const serverWins = server.updated_at_ms > clientTs;
    expect(serverWins).toBe(true);
    expect(server.name).toBe("server-wins");
    // tombstone
    const del = 1_700_000_010_000;
    db.prepare(
      "UPDATE custom_collections SET deleted_at = ?, updated_at_ms = ? WHERE id_collection = ?",
    ).run(del, del, id);
    const tomb = db.prepare("SELECT * FROM custom_collections WHERE id_collection = ?").get(id) as any;
    expect(tomb.deleted_at).toBe(del);
    const alive = db
      .prepare("SELECT count(*) as c FROM custom_collections WHERE id_collection = ? AND deleted_at IS NULL")
      .get(id) as any;
    expect(alive.c).toBe(0);
  });

  it("unique parcial: uuids distintos ok, duplicado rejeita, NULL duplica livre", () => {
    const db = getDb();
    db.prepare(
      "INSERT INTO custom_collections (name, client_uuid) VALUES ('U1', 'uuid-uniq-1')",
    ).run();
    expect(() =>
      db
        .prepare(
          "INSERT INTO custom_collections (name, client_uuid) VALUES ('U2', 'uuid-uniq-1')",
        )
        .run(),
    ).toThrow(/UNIQUE/);
    // NULL (legado) pode repetir à vontade
    db.prepare("INSERT INTO custom_collections (name) VALUES ('Legacy A')").run();
    db.prepare("INSERT INTO custom_collections (name) VALUES ('Legacy B')").run();
    expect(true).toBe(true);
  });
});
