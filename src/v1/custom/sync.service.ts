/**
 * Sync engine — coração do offline-first (gauntlet P3).
 *
 * POST /v1/custom/sync (Bearer obrigatório — sync é sempre autenticado)
 *
 * Modelo: batch LWW (last-writer-wins) por item, relógio = updated_at_ms
 * (ms epoch inteiro). Identidade client-side = client_uuid (uuid v4).
 *
 * Regras por item enviado:
 *   - Item sem correspondência no servidor (por client_uuid) → cria.
 *   - Correspondência encontrada:
 *       client.updated_at_ms >  server.updated_at_ms → client vence (aplica).
 *       caso contrário                               → server vence (estado
 *                                                       server volta na
 *                                                       resposta; cliente
 *                                                       descarta o dele).
 *   - Tombstone (deleted_at setado) sempre aplica quando vence LWW; nunca
 *     "ressuscita" item deletado: criação com client_uuid tombstoned é
 *     rejeitada (retorna estado server = tombstone).
 *
 * Coalescing de operações é responsabilidade do cliente (outbox) — o
 * servidor só vê o estado final por item.
 *
 * Response: { server_time, applied: {created, updated}, collections: [...],
 *             conflicts: [{client_uuid, resolution}] }
 */
import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { getDb } from "../../db/connection.js";
import type { CustomAuthEnv } from "./auth.middleware.js";

export const CustomSyncMusicSchema = z.object({
  client_uuid: z.string().min(8).max(64),
  name: z.string().max(300).nullable().optional(),
  lyric: z.string().nullable().optional(),
  auxiliary_lyric: z.string().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  official_music_id: z.number().int().nullable().optional(),
  lyrics: z
    .array(
      z.object({
        lyric: z.string(),
        aux_lyric: z.string().nullable().optional(),
        time: z.string().default("00:00"),
        instrumental_time: z.string().default("00:00"),
        show_slide: z.number().int().default(1),
        order: z.number().int().default(0),
      }),
    )
    .max(200)
    .optional(),
  updated_at: z.number().int().nonnegative(),
  deleted_at: z.number().int().nonnegative().nullable().optional(),
});

export const CustomSyncCollectionSchema = z.object({
  client_uuid: z.string().min(8).max(64),
  name: z.string().max(200),
  description: z.string().max(2000).nullable().optional(),
  author_name: z.string().max(200).nullable().optional(),
  musics: z.array(CustomSyncMusicSchema).max(2000).optional(),
  updated_at: z.number().int().nonnegative(),
  deleted_at: z.number().int().nonnegative().nullable().optional(),
});

export const SyncRequestSchema = z.object({
  collections: z.array(CustomSyncCollectionSchema).max(500),
});

export type SyncRequest = z.infer<typeof SyncRequestSchema>;
export type SyncCollection = z.infer<typeof CustomSyncCollectionSchema>;
export type SyncMusic = z.infer<typeof CustomSyncMusicSchema>;

export type SyncResultCollection = {
  client_uuid: string | null;
  id_collection: number;
  name: string;
  description: string | null;
  author_name: string | null;
  deleted_at: number | null;
  updated_at_ms: number;
  is_owner: boolean;
  musics: Array<{
    client_uuid: string | null;
    id_music: number;
    name: string | null;
    lyric: string | null;
    auxiliary_lyric: string | null;
    duration: number | null;
    official_music_id: number | null;
    deleted_at: number | null;
    updated_at_ms: number;
    is_owner: boolean;
    lyrics: Array<Record<string, unknown>>;
  }>;
};

/** uuid v4 fake-gerado no servidor para backfill de legado (não client_uuid). */
function legacyUuid(): string {
  // biome-ignore lint/suspicious/noExplicitAny: crypto global ok em node
  const g: any = globalThis;
  return g.crypto.randomUUID();
}

export const requireSyncAuth: MiddlewareHandler<CustomAuthEnv> =
  createMiddleware<CustomAuthEnv>(async (c, next) => {
    const raw = c.req.header("authorization") ?? "";
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
    if (!token) return c.json({ error: "Não autenticado" }, 401);
    const { hashToken } = await import("./auth.service.js");
    const session = getDb()
      .prepare(
        `SELECT cu.id_user FROM custom_sessions cs
         INNER JOIN custom_users cu ON cu.id_user = cs.id_user
         WHERE cs.token_hash = ?`,
      )
      .get(hashToken(token)) as { id_user: number } | undefined;
    if (!session) return c.json({ error: "Não autenticado" }, 401);
    c.set("user", { id_user: session.id_user, email: "", display_name: "" });
    await next();
  });

function nowMs(): number {
  return Date.now();
}

function ensureUuid(db: ReturnType<typeof getDb>, table: string, idCol: string, id: number, current: string | null): string {
  if (current) return current;
  const u = legacyUuid();
  db.prepare(`UPDATE ${table} SET client_uuid = ? WHERE ${idCol} = ?`).run(u, id);
  return u;
}

function loadServerCollections(
  db: ReturnType<typeof getDb>,
  userId: number,
): SyncResultCollection[] {
  const cols = db
    .prepare(
      `SELECT cc.* FROM custom_collections cc
       WHERE cc.deleted_at IS NULL AND (cc.owner_id = ? OR cc.owner_id IS NULL)
       ORDER BY cc.id_collection`,
    )
    .all(userId) as any[];

  return cols.map((col) => {
    const musics = db
      .prepare(
        `SELECT * FROM custom_musics
         WHERE id_collection = ? AND deleted_at IS NULL ORDER BY id_music`,
      )
      .all(col.id_collection) as any[];

    return {
      client_uuid: col.client_uuid ?? null,
      id_collection: col.id_collection,
      name: col.name,
      description: col.description ?? null,
      author_name: col.author_name ?? null,
      deleted_at: col.deleted_at ?? null,
      updated_at_ms: col.updated_at_ms ?? 0,
      is_owner: col.owner_id === userId,
      musics: musics.map((m) => {
        const lyrics = db
          .prepare(
            `SELECT id_lyric, lyric, aux_lyric, time, instrumental_time, show_slide, "order"
             FROM custom_lyrics WHERE id_music = ? ORDER BY "order", id_lyric`,
          )
          .all(m.id_music) as Array<Record<string, unknown>>;
        return {
          client_uuid: m.client_uuid ?? null,
          id_music: m.id_music,
          name: m.name ?? null,
          lyric: m.lyric ?? null,
          auxiliary_lyric: m.auxiliary_lyric ?? null,
          duration: m.duration ?? null,
          official_music_id: m.official_music_id ?? null,
          deleted_at: m.deleted_at ?? null,
          updated_at_ms: m.updated_at_ms ?? 0,
          is_owner: m.owner_id === userId,
          lyrics,
        };
      }),
    };
  });
}

function applyCollection(
  db: ReturnType<typeof getDb>,
  userId: number,
  incoming: SyncCollection,
  applied: { created: number; updated: number },
  conflicts: Array<{ client_uuid: string; resolution: string }>,
): void {
  const existing = db
    .prepare(
      `SELECT cc.*, u.id_user as owner_matched
       FROM custom_collections cc
       LEFT JOIN custom_users u ON u.id_user = cc.owner_id
       WHERE cc.client_uuid = ?`,
    )
    .get(incoming.client_uuid) as any;

  if (!existing) {
    // criação — mas se algum tombstone existia com esse uuid (purgado?) não há
    // como saber; assume novo. owner = quem sincroniza.
    const t = incoming.deleted_at ?? incoming.updated_at;
    const r = db
      .prepare(
        `INSERT INTO custom_collections
           (name, description, author_name, owner_id, client_uuid, deleted_at, updated_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        incoming.name,
        incoming.description ?? null,
        incoming.author_name ?? null,
        userId,
        incoming.client_uuid,
        incoming.deleted_at ?? null,
        incoming.deleted_at ?? incoming.updated_at,
      );
    const idCol = Number(r.lastInsertRowid);
    applied.created++;
    for (const m of incoming.musics ?? []) {
      applyMusic(db, userId, idCol, m, applied, conflicts);
    }
    return;
  }

  const serverTs = existing.updated_at_ms ?? 0;
  const clientTs = incoming.deleted_at ?? incoming.updated_at;

  if (clientTs > serverTs) {
    // client vence — mas só se tiver permissão (dono ou legado público)
    if (existing.owner_id !== null && existing.owner_id !== userId) {
      conflicts.push({
        client_uuid: incoming.client_uuid,
        resolution: "server-wins-forbidden",
      });
      return;
    }
    db.prepare(
      `UPDATE custom_collections
         SET name = ?, description = ?, author_name = ?, deleted_at = ?, updated_at_ms = ?
       WHERE id_collection = ?`,
    ).run(
      incoming.name,
      incoming.description ?? null,
      incoming.author_name ?? existing.author_name ?? null,
      incoming.deleted_at ?? null,
      clientTs,
      existing.id_collection,
    );
    applied.updated++;
    if (!incoming.deleted_at) {
      for (const m of incoming.musics ?? []) {
        applyMusic(db, userId, existing.id_collection, m, applied, conflicts);
      }
    }
  } else {
    conflicts.push({ client_uuid: incoming.client_uuid, resolution: "server-wins" });
  }
}

function applyMusic(
  db: ReturnType<typeof getDb>,
  userId: number,
  collectionId: number,
  incoming: SyncMusic,
  applied: { created: number; updated: number },
  conflicts: Array<{ client_uuid: string; resolution: string }>,
): void {
  const existing = db
    .prepare(`SELECT * FROM custom_musics WHERE client_uuid = ?`)
    .get(incoming.client_uuid) as any;

  if (!existing) {
    const t = incoming.deleted_at ?? incoming.updated_at;
    const r = db
      .prepare(
        `INSERT INTO custom_musics
           (id_collection, name, lyric, auxiliary_lyric, duration, official_music_id,
            owner_id, client_uuid, deleted_at, updated_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        collectionId,
        incoming.name ?? null,
        incoming.lyric ?? null,
        incoming.auxiliary_lyric ?? null,
        incoming.duration ?? null,
        incoming.official_music_id ?? null,
        userId,
        incoming.client_uuid,
        incoming.deleted_at ?? null,
        t,
      );
    const idMusic = Number(r.lastInsertRowid);
    if (!incoming.deleted_at && incoming.lyrics?.length) {
      replaceLyrics(db, idMusic, incoming.lyrics);
    }
    applied.created++;
    return;
  }

  const serverTs = existing.updated_at_ms ?? 0;
  const clientTs = incoming.deleted_at ?? incoming.updated_at;

  if (clientTs > serverTs) {
    if (existing.owner_id !== null && existing.owner_id !== userId) {
      conflicts.push({
        client_uuid: incoming.client_uuid,
        resolution: "server-wins-forbidden",
      });
      return;
    }
    db.prepare(
      `UPDATE custom_musics
         SET id_collection = ?, name = ?, lyric = ?, auxiliary_lyric = ?,
             duration = ?, official_music_id = ?, deleted_at = ?, updated_at_ms = ?
       WHERE id_music = ?`,
    ).run(
      collectionId,
      incoming.name ?? null,
      incoming.lyric ?? null,
      incoming.auxiliary_lyric ?? null,
      incoming.duration ?? null,
      incoming.official_music_id ?? null,
      incoming.deleted_at ?? null,
      clientTs,
      existing.id_music,
    );
    applied.updated++;
    if (!incoming.deleted_at && incoming.lyrics?.length) {
      replaceLyrics(db, existing.id_music, incoming.lyrics);
    }
  } else {
    conflicts.push({ client_uuid: incoming.client_uuid, resolution: "server-wins" });
  }
}

function replaceLyrics(
  db: ReturnType<typeof getDb>,
  idMusic: number,
  lyrics: NonNullable<SyncMusic["lyrics"]>,
): void {
  db.prepare(`DELETE FROM custom_lyrics WHERE id_music = ?`).run(idMusic);
  const ins = db.prepare(
    `INSERT INTO custom_lyrics (id_music, lyric, aux_lyric, time, instrumental_time, show_slide, "order", updated_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const l of lyrics) {
    ins.run(idMusic, l.lyric, l.aux_lyric ?? null, l.time, l.instrumental_time, l.show_slide, l.order, nowMs());
  }
}

export function runSync(userId: number, body: SyncRequest) {
  const db = getDb();
  const applied = { created: 0, updated: 0 };
  const conflicts: Array<{ client_uuid: string; resolution: string }> = [];

  for (const col of body.collections) {
    applyCollection(db, userId, col, applied, conflicts);
  }

  return {
    server_time: nowMs(),
    applied,
    conflicts,
    collections: loadServerCollections(db, userId),
  };
}
